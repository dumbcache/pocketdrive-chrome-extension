const FileCard = ({ info }) => {
    return (
        <div className="file-card">
            <img src={info.thumbnailLink} alt="img" className="pic" />
        </div>
    );
};

export default FileCard;
