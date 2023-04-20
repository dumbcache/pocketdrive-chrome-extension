import { Link } from "react-router-dom";
import { useState, useEffect } from "react";

async function getThumbs(parent) {
    const url = `https://www.googleapis.com/drive/v3/files?q='${parent}' in parents and mimeType contains 'image/'&fields=files(id,thumbnailLink)&pageSize=3`;
    const token = window.localStorage.getItem("token");
    let req = await fetch(url, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const { files } = await req.json();
    return files;
}
const DirCard = ({ info }) => {
    const [thumbs, setThumbs] = useState([]);
    useEffect(() => {
        (async () => {
            const thumbnails = await getThumbs(info.id);
            setThumbs(thumbnails);
            console.log(thumbs);
        })();
    }, []);
    return (
        <div className="dir-card">
            <Link to={`/d/${info.id}`}>
                <div className="cover">
                    {thumbs &&
                        thumbs.map((info, i) => (
                            <img
                                key={i}
                                src={info.thumbnailLink}
                                alt="pic"
                                className="pic"
                            />
                        ))}
                </div>
            </Link>
            <p>{info.name}</p>
        </div>
    );
};
export default DirCard;
