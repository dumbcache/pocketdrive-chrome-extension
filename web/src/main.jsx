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
import Template, { loader as dataLoader } from "./components/Template";
import Root from "./components/Root";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Root />,
        children: [
            { path: "login", element: <Login /> },
            {
                path: "/d",
                element: <Navigate to="/user" />,
                children: [{}],
            },
            {
                path: "/d/:id",
                element: <App />,
                children: [{ path: ":id", element: <Template /> }],
                loader: dataLoader,
            },
        ],
    },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <RouterProvider router={router}></RouterProvider>
    </React.StrictMode>
);
