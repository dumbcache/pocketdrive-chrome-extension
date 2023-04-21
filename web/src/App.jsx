import { Navigate, Route, Routes } from "react-router-dom";
import "./App.css";

import Template, { loader as templateLoader } from "./components/Template";

export default function App() {
    return (
        <div className="app">
            <Template />
        </div>
    );
}
