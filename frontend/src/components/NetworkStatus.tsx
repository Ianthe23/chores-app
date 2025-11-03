import React from "react";
import { IonChip, IonIcon } from "@ionic/react";
import { wifiOutline, cloudOfflineOutline } from "ionicons/icons";
import { useNetwork } from "../network/NetworkProvider";

const NetworkStatus: React.FC<{ unsyncedCount?: number }> = ({
  unsyncedCount = 0,
}) => {
  const { isOnline } = useNetwork();
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <IonChip color={isOnline ? "success" : "medium"}>
        <IonIcon
          icon={isOnline ? wifiOutline : cloudOfflineOutline}
          style={{ marginRight: 6 }}
        />
        {isOnline ? "Online" : "Offline"}
      </IonChip>
      {unsyncedCount > 0 && (
        <IonChip color="warning">Pending: {unsyncedCount}</IonChip>
      )}
    </div>
  );
};

export default NetworkStatus;
