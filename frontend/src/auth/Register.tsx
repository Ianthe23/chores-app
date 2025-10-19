import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonText,
  IonIcon,
  IonToast,
  IonSpinner,
  IonBackButton,
  IonButtons
} from '@ionic/react';
import { personOutline, lockClosedOutline, personAddOutline, arrowBackOutline } from 'ionicons/icons';
import { useAuth } from './AuthProvider';
import { useHistory } from 'react-router-dom';

const Register: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const { register } = useAuth();
  const history = useHistory();

  const handleRegister = async () => {
    if (!username || !password || !confirmPassword) {
      setToastMessage('Please fill in all fields');
      setShowToast(true);
      return;
    }

    if (password !== confirmPassword) {
      setToastMessage('Passwords do not match');
      setShowToast(true);
      return;
    }

    if (password.length < 6) {
      setToastMessage('Password must be at least 6 characters long');
      setShowToast(true);
      return;
    }

    setIsLoading(true);
    try {
      await register(username, password);
      history.push('/dashboard');
    } catch (error: any) {
      setToastMessage(error.response?.data?.error || 'Registration failed');
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <IonPage>
      <IonHeader className="modern-header header-gradient">
        <IonToolbar className="modern-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/login" icon={arrowBackOutline} />
          </IonButtons>
          <IonTitle>Create Account</IonTitle>
        </IonToolbar>
      </IonHeader>
      
      <IonContent className="ion-padding gradient-bg">
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '100%' }}>
          <IonCard className="modern-card fade-in">
            <IonCardHeader>
              <IonCardTitle className="ion-text-center">
                <IonText color="primary">
                  <h1 className="gradient-text">Join ChoreFlow</h1>
                </IonText>
              </IonCardTitle>
              <IonText color="medium" className="ion-text-center">
                <p>Create your account to get started</p>
              </IonText>
            </IonCardHeader>
            
            <IonCardContent>
              <IonItem className="modern-input" lines="none">
                <IonIcon icon={personOutline} slot="start" color="medium" />
                <IonLabel position="stacked">Username</IonLabel>
                <IonInput
                  type="text"
                  value={username}
                  onIonInput={(e) => setUsername(e.detail.value!)}
                  placeholder="Choose a username"
                />
              </IonItem>
              
              <IonItem className="modern-input" lines="none" style={{ marginTop: '16px' }}>
                <IonIcon icon={lockClosedOutline} slot="start" color="medium" />
                <IonLabel position="stacked">Password</IonLabel>
                <IonInput
                  type="password"
                  value={password}
                  onIonInput={(e) => setPassword(e.detail.value!)}
                  placeholder="Create a password (min 6 characters)"
                />
              </IonItem>
              
              <IonItem className="modern-input" lines="none" style={{ marginTop: '16px' }}>
                <IonIcon icon={lockClosedOutline} slot="start" color="medium" />
                <IonLabel position="stacked">Confirm Password</IonLabel>
                <IonInput
                  type="password"
                  value={confirmPassword}
                  onIonInput={(e) => setConfirmPassword(e.detail.value!)}
                  placeholder="Confirm your password"
                />
              </IonItem>
              
              <IonButton
                expand="block"
                className="modern-button button-gradient"
                onClick={handleRegister}
                disabled={isLoading}
                style={{ marginTop: '24px' }}
              >
                {isLoading ? (
                  <IonSpinner name="crescent" />
                ) : (
                  <>
                    <IonIcon icon={personAddOutline} slot="start" />
                    Create Account
                  </>
                )}
              </IonButton>
            </IonCardContent>
          </IonCard>
        </div>
        
        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          color={toastMessage.includes('success') ? 'success' : 'danger'}
        />
      </IonContent>
    </IonPage>
  );
};

export default Register;