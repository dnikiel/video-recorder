import { useEffect, useState } from 'react';
import VideoPlayer from '../../components/VideoPlayer';

const VideoReviews = () => {
  const [videoList, setVideoList] = useState([]);

  useEffect(() => {
    fetch(
      `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_NAME}/video/list/video_review.json`
    )
      .then((res) => res.json())
      .then((res) => {
        setVideoList(res.resources);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  return (
    <div>
      {videoList.map((video) => (
        <VideoPlayer key={video.public_id} assetId={video.public_id} />
      ))}
    </div>
  );
};

export default VideoReviews;
