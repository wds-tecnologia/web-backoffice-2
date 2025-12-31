import { JSX, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";

interface GuardedRouteProps {
    /**
     * Permission check for route
     * @default false
     */
    isRouteAccessible?: boolean;
    /**
     * Route to be redirected to
     * @default '/'
     */
    redirectRoute?: string;
}

const GuardedRoute = ({
    isRouteAccessible = false,
    redirectRoute = '/',
}: GuardedRouteProps): JSX.Element => {
    return isRouteAccessible ? <Outlet /> : <Navigate to={redirectRoute} replace />;
};

export default GuardedRoute;
