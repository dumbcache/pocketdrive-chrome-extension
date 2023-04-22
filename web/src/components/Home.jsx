import { useContext, useEffect } from "react";
import Login from "./Login";

const Home = () => {
    return (
        <div className="home">
            <h1 className="title">Krabs</h1>
            <hr className="sep" />
            <Login />
        </div>
    );
};

export default Home;
