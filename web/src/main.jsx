import React from "react";
import ReactDOM from "react-dom/client";
import {
    Route,
    createRoutesFromElements,
    Navigate,
    RouterProvider,
} from "react-router-dom";
import "./index.css";
import Template, { loader as dataLoader } from "./components/Template";
import Root from "./components/Root";
import Login from "./components/Login";
import { createBrowserRouter } from "react-router-dom";

const routes = createRoutesFromElements(
    <>
        <Route path="/" element={<Root />} />
        <Route path="/login" element={<Login />} />
        <Route path="/d">
            <Route index element={<Template />} loader={dataLoader} />
            <Route path=":id" element={<Template />} loader={dataLoader} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
    </>
);
const router = createBrowserRouter(routes);

ReactDOM.createRoot(document.getElementById("root")).render(
    <React.StrictMode>
        <RouterProvider router={router}></RouterProvider>
    </React.StrictMode>
);
