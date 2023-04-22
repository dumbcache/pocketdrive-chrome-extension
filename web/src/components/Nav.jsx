import { Link } from "react-router-dom";

const Nav = () => {
    return (
        <header className="header">
            <Link to="/">
                <h1 className="logo">K</h1>
            </Link>
            <nav>breadCrumbs</nav>
            <button className="logout-button">logout</button>
        </header>
    );
};

export default Nav;
