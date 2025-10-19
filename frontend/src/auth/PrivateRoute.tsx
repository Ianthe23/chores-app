import React from 'react';
import { Route, Redirect } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import { IonSpinner, IonContent, IonPage } from '@ionic/react';

interface PrivateRouteProps {
  component: React.ComponentType<any>;
  path: string;
  exact?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ component: Component, ...rest }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <IonPage>
        <IonContent className="ion-padding">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <IonSpinner name="crescent" color="primary" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <Route
      {...rest}
      render={(props) =>
        user ? <Component {...props} /> : <Redirect to="/login" />
      }
    />
  );
};

export default PrivateRoute;