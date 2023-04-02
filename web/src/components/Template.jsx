import { Route, Routes, useParams } from "react-router-dom";
import Dir from "./Dir";
import File from "./File";

export default function Template() {
    const params = useParams();
    console.log(params);
    return (
        <div>
            <div>{params.id}</div>
            <Dir />
            <File />
        </div>
    );
}
