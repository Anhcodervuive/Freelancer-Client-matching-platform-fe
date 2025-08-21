const VideoDecoration = () => {
	return (
		<div className='w-full h-full'>
			<video
				src='/video/video_decoration_login.mp4'
				className='w-full h-full object-cover'
				autoPlay
				loop
				muted
				playsInline
			/>
		</div>
	)
}

export default VideoDecoration
