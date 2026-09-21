import { Navigate } from "react-router-dom";

export default function ProtectedRoute({ children }) {

    const loggedIn = sessionStorage.getItem("isLoggedIn");

    if(loggedIn !== "true"){
        return <Navigate to="/login" replace />;
    }

    return children;
}