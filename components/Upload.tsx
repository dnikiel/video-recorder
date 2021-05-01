import { useEffect, useState } from 'react';
import VideoPlayer from './VideoPlayer';

type Props = {
  file: File;
};

const MAX_VIDEO_DURATION_MIN = 1;

const Upload = ({ file }: Props) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [assetId, setAssetId] = useState(null);

  const createUpload = async () => {
    try {
      return fetch('/api/uploads')
        .then((res) => res.json())
        .then(({ timestamp, signature }) => {
          return { signature, timestamp };
        });
    } catch (e) {
      console.error('Error in createUpload', e);
      setErrorMessage('Error creating upload');
      return Promise.reject(e);
    }
  };

  const startUpload = async (_file: File) => {
    if (isUploading) {
      return;
    }

    setIsUploading(true);
    try {
      const { signature, timestamp } = await createUpload();
      const formData = new FormData();

      formData.append('file', _file);
      formData.append('tags', 'video_review');
      formData.append('api_key', process.env.NEXT_PUBLIC_CLOUDINARY_KEY);
      formData.append('timestamp', timestamp);
      formData.append('signature', signature);

      fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_NAME}/video/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )
        .then((res) => res.json())
        .then((data) => {
          console.log(data);
          setAssetId(data.public_id);
          setIsPreparing(true);
        })
        .catch((err) => console.log(err));
    } catch (err) {
      setErrorMessage(err.toString());
    }
  };

  const startFileValidation = (_file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Attempt to load the file as a video element and inspect its duration
      // metadata. This is not an authoritative check of video duration, but
      // rather intended to serve as just a simple and fast sanity check.
      if (!_file.type.includes('video')) {
        console.warn(`file type (${_file.type}) does not look like video!`);
        resolve();
      }

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = function () {
        URL.revokeObjectURL(video.src);
        if (video.duration !== Infinity && video.duration > MAX_VIDEO_DURATION_MIN * 60) {
          const dur = Math.round(video.duration * 100) / 100;
          reject(
            `file duration (${dur.toString()}s) exceeds allowed maximum (${MAX_VIDEO_DURATION_MIN}min)!`
          );
        }
        resolve();
      };
      video.onerror = function () {
        // The file has a video MIME type, but we were unable to load its
        // metadata for some reason.
        console.warn('failed to load video file metadata for validation!');
        URL.revokeObjectURL(video.src);
        resolve();
      };
      video.src = URL.createObjectURL(file);
    });
  };

  useEffect(() => {
    if (!file) {
      return;
    }

    startFileValidation(file)
      .then(() => {
        startUpload(file);
      })
      .catch((error) => {
        setErrorMessage(error);
      });
  }, [file]);

  return (
    <div>
      <div>{errorMessage}</div>
      {assetId && <VideoPlayer assetId={assetId} />}
    </div>
  );
};

export default Upload;
