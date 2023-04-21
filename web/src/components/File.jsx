import { Link } from "react-router-dom";
import FileCard from "./FileCard";

export default function File({ files }) {
    return (
        <div className="file-wrapper">
            {files.map((info) => (
                <Link key={info.id} to={`/d/home/preview`}>
                    <FileCard info={info} />
                </Link>
            ))}
        </div>
    );
}
