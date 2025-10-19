import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonItem,
  IonLabel,
  IonButton,
  IonIcon,
  IonAvatar,
  IonList,
  IonToggle,
  IonAlert,
  IonToast,
  IonBackButton,
  IonButtons,
  IonText,
  IonTabBar,
  IonTabButton,
} from "@ionic/react";
import {
  person,
  settings,
  notificationsOutline,
  moon,
  logOut,
  calendar,
  checkmarkCircle,
  timeOutline,
  alertCircle,
  homeOutline,
  listOutline,
  personOutline,
} from "ionicons/icons";
import { useAuth } from "../auth/AuthProvider";
import { useChores } from "../chores/ChoreProvider";
import { useHistory } from "react-router-dom";

const Profile: React.FC = () => {
  const { user, logout } = useAuth();
  const { chores } = useChores();
  const history = useHistory();
  const [showLogoutAlert, setShowLogoutAlert] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const handleLogout = async () => {
    try {
      await logout();
      setToastMessage("Logged out successfully");
      setShowToast(true);
    } catch (error) {
      setToastMessage("Error logging out");
      setShowToast(true);
    }
  };

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    document.body.classList.toggle("dark", checked);
    setToastMessage(`Dark mode ${checked ? "enabled" : "disabled"}`);
    setShowToast(true);
  };

  const toggleNotifications = (checked: boolean) => {
    setNotifications(checked);
    setToastMessage(`Notifications ${checked ? "enabled" : "disabled"}`);
    setShowToast(true);
  };

  // Calculate user statistics
  const completedChores = chores.filter(
    (chore) => chore.status === "completed"
  ).length;
  const pendingChores = chores.filter(
    (chore) => chore.status === "pending"
  ).length;
  const inProgressChores = chores.filter(
    (chore) => chore.status === "in-progress"
  ).length;
  const totalChores = chores.length;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/dashboard" />
          </IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="profile-content">
        {/* User Info Card */}
        <IonCard className="profile-card">
          <IonCardContent>
            <div className="profile-header">
              <IonAvatar className="profile-avatar">
                <div className="avatar-placeholder">
                  <IonIcon icon={person} />
                </div>
              </IonAvatar>
              <div className="profile-info">
                <h2>{user?.username || "User"}</h2>
                <IonText color="medium">
                  <p>
                    <IonIcon icon={calendar} /> Member since{" "}
                    {new Date().toLocaleDateString()}
                  </p>
                </IonText>
              </div>
            </div>
          </IonCardContent>
        </IonCard>

        {/* Statistics Card */}
        <IonCard className="stats-card">
          <IonCardHeader>
            <IonCardTitle>Your Statistics</IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <div className="stats-grid">
              <div className="stat-item">
                <IonIcon icon={checkmarkCircle} color="success" />
                <div>
                  <h3>{completedChores}</h3>
                  <p>Completed</p>
                </div>
              </div>
              <div className="stat-item">
                <IonIcon icon={timeOutline} color="warning" />
                <div>
                  <h3>{inProgressChores}</h3>
                  <p>In Progress</p>
                </div>
              </div>
              <div className="stat-item">
                <IonIcon icon={alertCircle} color="medium" />
                <div>
                  <h3>{pendingChores}</h3>
                  <p>Pending</p>
                </div>
              </div>
              <div className="stat-item">
                <IonIcon icon={person} color="primary" />
                <div>
                  <h3>{totalChores}</h3>
                  <p>Total Chores</p>
                </div>
              </div>
            </div>
            {totalChores > 0 && (
              <div className="completion-rate">
                <IonText color="medium">
                  <p>
                    Completion Rate:{" "}
                    {Math.round((completedChores / totalChores) * 100)}%
                  </p>
                </IonText>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${(completedChores / totalChores) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            )}
          </IonCardContent>
        </IonCard>

        {/* Settings Card */}
        <IonCard className="settings-card">
          <IonCardHeader>
            <IonCardTitle>
              <IonIcon icon={settings} /> Settings
            </IonCardTitle>
          </IonCardHeader>
          <IonCardContent>
            <IonList>
              <IonItem>
                <IonIcon icon={moon} slot="start" />
                <IonLabel>Dark Mode</IonLabel>
                <IonToggle
                  checked={darkMode}
                  onIonChange={(e) => toggleDarkMode(e.detail.checked)}
                />
              </IonItem>

              <IonItem>
                <IonIcon icon={notificationsOutline} slot="start" />
                <IonLabel>Notifications</IonLabel>
                <IonToggle
                  checked={notifications}
                  onIonChange={(e) => toggleNotifications(e.detail.checked)}
                />
              </IonItem>
            </IonList>
          </IonCardContent>
        </IonCard>

        {/* Actions Card */}
        <IonCard className="actions-card">
          <IonCardContent>
            <IonButton
              expand="block"
              fill="outline"
              color="danger"
              onClick={() => setShowLogoutAlert(true)}
            >
              <IonIcon icon={logOut} slot="start" />
              Logout
            </IonButton>
          </IonCardContent>
        </IonCard>

        {/* Logout Confirmation Alert */}
        <IonAlert
          isOpen={showLogoutAlert}
          onDidDismiss={() => setShowLogoutAlert(false)}
          header="Confirm Logout"
          message="Are you sure you want to logout?"
          buttons={[
            {
              text: "Cancel",
              role: "cancel",
            },
            {
              text: "Logout",
              role: "confirm",
              handler: handleLogout,
            },
          ]}
        />

        {/* Toast for feedback */}
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="bottom"
        />
      </IonContent>

      {/* Bottom Tab Bar */}
      <IonTabBar slot="bottom" className="modern-tab-bar">
        <IonTabButton
          tab="dashboard"
          onClick={() => history.push("/dashboard")}
        >
          <IonIcon icon={homeOutline} />
          <span>Dashboard</span>
        </IonTabButton>
        <IonTabButton tab="chores" onClick={() => history.push("/chores")}>
          <IonIcon icon={listOutline} />
          <span>Chores</span>
        </IonTabButton>
        <IonTabButton tab="profile" onClick={() => history.push("/profile")}>
          <IonIcon icon={personOutline} />
          <span>Profile</span>
        </IonTabButton>
      </IonTabBar>
    </IonPage>
  );
};

export default Profile;
