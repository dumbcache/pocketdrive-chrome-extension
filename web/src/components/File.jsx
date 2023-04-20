import FileCard from "./FileCard";

export default function File({ files }) {
    return (
        <div className="file-wrapper">
            {files.map((info) => (
                <FileCard key={info.id} info={info} />
            ))}
        </div>
    );
}
