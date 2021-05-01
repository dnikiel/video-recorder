import { Video, Transformation } from 'cloudinary-react';

const VideoPlayer = ({ assetId }) => {
  return (
    <Video
      cloudName={process.env.NEXT_PUBLIC_CLOUDINARY_NAME}
      publicId={assetId}
      format="mp4"
      controls
    ></Video>
  );
};

export default VideoPlayer;
