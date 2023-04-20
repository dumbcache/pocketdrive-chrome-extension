export async function loginHandler({ params }) {
    const token = import.meta.env.VITE_TOKEN;
    const api = import.meta.env.VITE_API;
    const req = await fetch(`${api}/auth`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const { token: t } = await req.json();
    localStorage.setItem("token", t);
}

const Login = () => {
    return (
        <button className="login" onClick={loginHandler}>
            Sign in using Google
        </button>
    );
};

export default Login;
