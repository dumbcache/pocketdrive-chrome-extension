import { useState } from "react";
import { Link, Outlet } from "react-router-dom";

const Root = () => {
    const [isLogged, setIsLogged] = useState(true);
    return (
        <>
            <nav className="nav">
                <h1 className="title">
                    <Link to=".">Krabs</Link>
                </h1>
                {/* <Link to="/">Home</Link> */}
                {isLogged ? (
                    <>
                        <Link to="/d/home">home</Link>
                        <Link to="/logout">logout</Link>
                    </>
                ) : (
                    <Link to="/login">login</Link>
                )}
            </nav>
            <main>
                <Outlet />
            </main>
        </>
    );
};

export default Root;
