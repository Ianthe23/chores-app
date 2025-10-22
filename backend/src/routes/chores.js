import express from "express";
import { v4 as uuidv4 } from "uuid";
import db from "../database.js";
import { broadcastToUser } from "../websocket.js";

const router = express.Router();

// Helper function to normalize chore data ensuring consistency between status and completed fields
const normalizeChoreData = (chore) => {
  if (!chore) return null;

  // Ensure consistency between status and completed fields
  // If status is provided, set completed based on status
  // If only completed is provided, set status based on completed
  let status = chore.status;
  let completed = chore.completed;

  if (status) {
    // Status takes precedence - set completed based on status
    completed = status === "completed";
  } else if (completed !== undefined) {
    // If no status but completed is defined, set status based on completed
    status = completed ? "completed" : "pending";
  } else {
    // Default values
    status = "pending";
    completed = false;
  }

  return {
    ...chore,
    status,
    completed,
  };
};

/**
 * @swagger
 * /api/chores:
 *   get:
 *     summary: Get all chores for the authenticated user
 *     tags: [Chores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's chores
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Chore'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", async (req, res) => {
  try {
    const chores = await db.allAsync(
      "SELECT * FROM chores WHERE user_id = ? ORDER BY created_at DESC",
      [req.user.id]
    );

    const normalizedChores = chores.map(normalizeChoreData);
    res.json(normalizedChores);
  } catch (error) {
    console.error("Get chores error:", error);
    res.status(500).json({ error: "Failed to fetch chores" });
  }
});

/**
 * @swagger
 * /api/chores:
 *   post:
 *     summary: Create a new chore
 *     tags: [Chores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 description: Title of the chore
 *                 example: "Clean the kitchen"
 *               description:
 *                 type: string
 *                 description: Detailed description of the chore
 *                 example: "Wash dishes, clean counters, and sweep floor"
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Priority level of the chore
 *                 example: "high"
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *                 default: pending
 *                 description: Status of the chore
 *                 example: "pending"
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Due date for the chore (ISO 8601 format)
 *                 example: "2024-12-31T23:59:59Z"
 *     responses:
 *       201:
 *         description: Chore created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chore'
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Title is required"
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Access denied. No token provided."
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: "Failed to create chore"
 */
// Create a new chore
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      priority = "medium",
      due_date,
      status = "pending",
      points = 0,
    } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const completed = status === "completed";
    const pointsValue = Number.isFinite(Number(points)) ? Number(points) : 0;

    const result = await db.runAsync(
      `INSERT INTO chores (user_id, title, description, priority, due_date, status, completed, points) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        description,
        priority,
        due_date,
        status,
        completed,
        pointsValue,
      ]
    );

    const newChore = await db.getAsync("SELECT * FROM chores WHERE id = ?", [
      result.lastID,
    ]);

    const normalizedChore = normalizeChoreData(newChore);

    // Broadcast to user via WebSocket
    broadcastToUser(req.user.id, {
      type: "CHORE_CREATED",
      chore: normalizedChore,
    });

    res.status(201).json(normalizedChore);
  } catch (error) {
    console.error("Create chore error:", error);
    res.status(500).json({ error: "Failed to create chore" });
  }
});

/**
 * @swagger
 * /api/chores/{id}:
 *   put:
 *     summary: Update a chore
 *     tags: [Chores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chore ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Chore title
 *                 example: Clean the kitchen
 *               description:
 *                 type: string
 *                 description: Detailed description of the chore
 *                 example: Wash dishes, clean counters, and sweep floor
 *               completed:
 *                 type: boolean
 *                 description: Completion status (deprecated, use status instead)
 *                 example: false
 *               status:
 *                 type: string
 *                 enum: [pending, in-progress, completed]
 *                 description: Chore status
 *                 example: pending
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 description: Chore priority level
 *               due_date:
 *                 type: string
 *                 format: date-time
 *                 description: Due date for the chore
 *                 example: 2024-12-31T23:59:59Z
 *     responses:
 *       200:
 *         description: Chore updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chore'
 *       404:
 *         description: Chore not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      completed,
      status,
      priority,
      due_date,
      points,
    } = req.body;

    // Check if chore belongs to user
    const existingChore = await db.getAsync(
      "SELECT * FROM chores WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );

    if (!existingChore) {
      return res.status(404).json({ error: "Chore not found" });
    }

    // Handle status and completed field synchronization
    let statusValue = status;
    let completedValue = completed;

    if (status !== undefined) {
      statusValue = status;
      completedValue = status === "completed";
    } else if (completed !== undefined) {
      completedValue = completed;
      statusValue = completed ? "completed" : "pending";
    }

    // Use existing values if not provided (partial update support)
    const updateData = {
      title: title !== undefined ? title : existingChore.title,
      description:
        description !== undefined ? description : existingChore.description,
      completed:
        completedValue !== undefined ? completedValue : existingChor.completed,
      status: statusValue !== undefined ? statusValue : existingChore.status,
      priority: priority !== undefined ? priority : existingChore.priority,
      due_date: due_date !== undefined ? due_date : existingChore.due_date,
      points:
        points !== undefined
          ? Number.isFinite(Number(points))
            ? Number(points)
            : existingChore.points
          : existingChore.points,
    };

    await db.runAsync(
      `UPDATE chores 
       SET title = ?, description = ?, completed = ?, status = ?, priority = ?, due_date = ?, points = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [
        updateData.title,
        updateData.description,
        updateData.completed,
        updateData.status,
        updateData.priority,
        updateData.due_date,
        updateData.points,
        id,
        req.user.id,
      ]
    );

    const updatedChore = await db.getAsync(
      "SELECT * FROM chores WHERE id = ?",
      [id]
    );

    const normalizedChore = normalizeChoreData(updatedChore);

    // Broadcast to user via WebSocket
    broadcastToUser(req.user.id, {
      type: "CHORE_UPDATED",
      chore: normalizedChore,
    });

    res.json(normalizedChore);
  } catch (error) {
    console.error("Update chore error:", error);
    res.status(500).json({ error: "Failed to update chore" });
  }
});

/**
 * @swagger
 * /api/chores/{id}:
 *   delete:
 *     summary: Delete a chore
 *     tags: [Chores]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Chore ID
 *     responses:
 *       204:
 *         description: Chore deleted successfully
 *       404:
 *         description: Chore not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized - invalid or missing token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if chore belongs to user
    const existingChore = await db.getAsync(
      "SELECT * FROM chores WHERE id = ? AND user_id = ?",
      [id, req.user.id]
    );

    if (!existingChore) {
      return res.status(404).json({ error: "Chore not found" });
    }

    await db.runAsync("DELETE FROM chores WHERE id = ? AND user_id = ?", [
      id,
      req.user.id,
    ]);

    // Broadcast to user via WebSocket
    broadcastToUser(req.user.id, {
      type: "CHORE_DELETED",
      choreId: parseInt(id),
    });

    res.status(204).send();
  } catch (error) {
    console.error("Delete chore error:", error);
    res.status(500).json({ error: "Failed to delete chore" });
  }
});

export default router;
