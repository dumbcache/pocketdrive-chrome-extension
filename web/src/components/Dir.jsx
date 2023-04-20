import { useState } from "react";
import DirCard from "./DirCard";
import { Link } from "react-router-dom";

export default function Dir({ dirs }) {
    return (
        <div className="dir-wrapper">
            {dirs && dirs.map((info) => <DirCard key={info.id} info={info} />)}
        </div>
    );
}
