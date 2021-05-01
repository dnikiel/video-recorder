import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';
import { RecordState } from '../types';
import Upload from '../components/Upload';

const MEDIA_RECORDER_TIMESLICE_MS = 2000;

const Home = () => {
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const mediaChunks = useRef<Blob[]>([]);
  const finalBlob = useRef<Blob | null>(null);
  const recordedVideo = useRef(null);
  const [file, setFile] = useState<File | null>(null);
  const [showUploadPage, setShowUploadPage] = useState(false);

  const [haveDeviceAccess, setHaveDeviceAccess] = useState(false);
  const [deviceList, setDevices] = useState({ video: [], audio: [] });
  const [recordState, setRecordState] = useState(RecordState.IDLE);
  const [isReviewing, setIsReviewing] = useState(false);

  const stopUserMedia = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log('stopping track', track.kind, track.label);
        track.stop();
      });
    }
    streamRef.current = null;
  };

  /*
   * Stop all recording
   */
  const cleanup = () => {
    console.log('cleanup');
    if (recorderRef.current) {
      if (recorderRef?.current?.state === 'inactive') {
        console.log('skipping recorder stop() b/c state is "inactive"');
      } else {
        recorderRef.current.onstop = function onRecorderStop() {
          console.log('recorder cleanup');
        };
        recorderRef.current.stop();
      }
    }
    mediaChunks.current = [];
    setRecordState(RecordState.IDLE);
  };

  const getDevices = async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const list = { video: [], audio: [] };

    devices.forEach((device) => {
      if (device.kind === 'videoinput') {
        list.video.push(device);
      }
      if (device.kind === 'audioinput') {
        list.audio.push(device);
      }
    });
    setDevices({ ...list });
  };

  const setupStream = (stream) => {
    streamRef.current = stream;
    if (videoRef.current !== null) {
      (videoRef.current as HTMLVideoElement).srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.controls = false;
    }
    setHaveDeviceAccess(true);
  };

  const handleClickStart = async () => {
    if (navigator.mediaDevices) {
      const video = true;
      const audio = true;
      const constraints = { video, audio };
      try {
        await getDevices();
        console.log('requesting user media with constraints', constraints);
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setupStream(stream);
      } catch (err) {
        console.log('getdevices error', err);
      }
    } else {
      console.log('navigator.mediaDevices not available in this browser');
    }
  };

  const startRecording = async () => {
    if (isRecording) {
      console.log('we are already recording');
      return;
    }
    if (isReviewing) {
      console.log('cannot start recording when you are reviewing your last recording');
      return;
    }
    console.log('start recording');
    try {
      // const preferredOptions = { mimeType: 'video/webm;codecs=vp9' };
      // const backupOptions = { mimeType: 'video/mp4;codecs:h264' };
      // let options = preferredOptions;
      /*
       * MediaRecorder.isTypeSupported is not a thing in safari,
       * good thing safari supports the preferredOptions
       */
      // if (typeof MediaRecorder.isTypeSupported === 'function') {
      //   if (!MediaRecorder.isTypeSupported(preferredOptions.mimeType)) {
      //     console.log('backupOptions', backupOptions);
      //     options = backupOptions;
      //   }
      // }

      const options = {};

      const stream = streamRef.current;
      if (!stream) throw new Error('Cannot record without a stream');
      recorderRef.current = new MediaRecorder(stream, options);
      recorderRef.current.start(MEDIA_RECORDER_TIMESLICE_MS);
      recorderRef.current.ondataavailable = (evt) => {
        mediaChunks.current.push(evt.data);
        console.log('added media recorder chunk', mediaChunks.current.length);
      };
      setRecordState(RecordState.RECORDING);
    } catch (err) {
      console.log(err);
    }
  };

  const stopRecording = () => {
    if (!recorderRef.current) {
      console.log('cannot stopRecording() without a recorderRef');
      return;
    }
    recorderRef.current.onstop = function onRecorderStop() {
      finalBlob.current = new Blob(mediaChunks.current, { type: 'video/mp4' });
      const objUrl = window.URL.createObjectURL(finalBlob.current);

      if (videoRef.current !== null) {
        console.log('stopped');
        videoRef.current.src = null;
        videoRef.current.srcObject = null;

        recordedVideo.current.srcObject = null;
        recordedVideo.current.src = objUrl;
        recordedVideo.current.controls = true;
        recordedVideo.current.muted = false;

        // Download
        // const a = document.createElement('a');
        // a.style.display = 'none';
        // a.href = objUrl;
        // a.download = 'test.mp4';
        // document.body.appendChild(a);
        // a.click();
        // setTimeout(() => {
        //   document.body.removeChild(a);
        //   window.URL.revokeObjectURL(objUrl);
        // }, 100);

        setIsReviewing(true);
      }

      cleanup();
    };
    recorderRef.current.stop();
    stopUserMedia();
  };

  const submitRecording = () => {
    if (!finalBlob.current) {
      console.log('Cannot submit recording without a blob');
      return;
    }
    const createdFile = new File([finalBlob.current], 'video-from-camera', {
      type: finalBlob.current.type,
    });
    setFile(createdFile);
    setShowUploadPage(true);
  };

  useEffect(() => {
    //
    // This updates the device list when the list changes. For example
    // plugging in or unplugging a mic or camera
    //
    navigator.mediaDevices.ondevicechange = getDevices;
  }, []);

  const isRecording = recordState === RecordState.RECORDING;

  return showUploadPage ? (
    <Upload file={file} />
  ) : (
    <div className={styles.container}>
      <Head>
        <title>Video Recorder</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <video id="gum" ref={videoRef} playsInline autoPlay muted></video>

        <video id="recorded" ref={recordedVideo} playsInline autoPlay></video>

        <div>
          <button id="start" onClick={handleClickStart}>
            Start camera
          </button>
          <button id="record" onClick={startRecording}>
            Start Recording
          </button>
          <button id="stop" onClick={stopRecording}>
            Stop Recording
          </button>
          <button id="upload" onClick={submitRecording}>
            Upload
          </button>
        </div>

        <div>
          <span id="errorMsg"></span>
        </div>
      </main>
    </div>
  );
};

export default Home;
