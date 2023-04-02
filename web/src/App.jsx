import { useLoaderData } from "react-router-dom";
import "./App.css";

import Navbar from "./components/Navbar";
import Template from "./components/Template";

export default function App() {
    console.log(useLoaderData());
    return (
        <div className="App">
            <Navbar />
            <Template />
        </div>
    );
}
