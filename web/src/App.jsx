import "./App.css";
import {
    Route,
    createRoutesFromElements,
    Navigate,
    RouterProvider,
} from "react-router-dom";
import Template, { loader as dataLoader } from "./components/Template";
import Home from "./components/Home";
import { createBrowserRouter } from "react-router-dom";
import Nav from "./components/Nav";
import { LoginContext } from "./scripts/utils";
import { useState } from "react";

const routes = createRoutesFromElements(
    <>
        <Route path="/" element={<Home />} />
        <Route path="/d" element={<Nav />}>
            <Route index element={<Template />} loader={dataLoader} />
            <Route path=":id" element={<Template />} loader={dataLoader} />
        </Route>
        <Route path="*" element={<Navigate to="/" />} />
    </>
);
const router = createBrowserRouter(routes);

export default function App() {
    const [loggedIn, setLoggedIn] = useState(true);
    return (
        <div className="app">
            <LoginContext.Provider value={{ loggedIn, setLoggedIn }}>
                <RouterProvider router={router}></RouterProvider>
            </LoginContext.Provider>
        </div>
    );
}
