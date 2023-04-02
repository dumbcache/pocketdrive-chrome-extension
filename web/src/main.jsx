import React from "react";
import ReactDOM from "react-dom/client";
import {
    createBrowserRouter,
    Navigate,
    RouterProvider,
} from "react-router-dom";
import App from "./App";
import Login from "./components/Login";
import "./index.css";
import Template from "./components/Template";

export function loader({ params }) {
    return params.username;
}
const router = createBrowserRouter([
    { path: "login", element: <Login />, loader },
    {
        path: "/",
        element: <Navigate to="/user" />,
    },
    {
        path: "/:username",
        element: <App />,
        loader,
        children: [{ path: ":id", element: <Template /> }],
    },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <RouterProvider router={router}></RouterProvider>
    </React.StrictMode>
);
