// Camera utility - based on https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Taking_still_photos

let width = 0;
let height = 0;
let streaming = false;

let video = null;
let canvas = null;
let startbutton = null;

let photoCallback = null;

function setup(config = {}) {

	width = config.width || screen.width;

	photoCallback = config.callback;

	video = document.getElementById('camera-view');
	canvas = document.getElementById('canvas');
	startbutton = document.getElementById('take-photo-btn');
	document.getElementById('save-photo-btn').addEventListener('click', (evt) => {
		evt.preventDefault();
		savePhoto();
	});
	document.getElementById('reject-photo-btn').addEventListener('click', (evt) => {
		evt.preventDefault();
		rejectPhoto();
	});

	navigator.mediaDevices.getUserMedia({video: true, audio: false})
		.then((stream) => {
			video.srcObject = stream;
			video.play();
		})
	.catch((err) => {
		console.error('Error getting video', err);
	});

	video.addEventListener('canplay', (evt) => {
		if(!streaming) {
			height = video.videoHeight / (video.videoWidth / width);
			video.setAttribute('width', width);
			video.setAttribute('height', height);
			canvas.setAttribute('width', width);
			canvas.setAttribute('height', height);
			streaming = true;
		}
	}, false);

	startbutton.addEventListener('click', (evt) => {
		evt.preventDefault();
		takePicture();
	}, false);

	clearPhoto();
}

function clearPhoto() {
	const context = canvas.getContext('2d');
	context.fillStyle = '#AAA';
	context.fillRect(0, 0, canvas.width, canvas.height);

	canvas.parentNode.classList.remove('camera__preview');
}

function takePicture() {
	const context = canvas.getContext('2d');
	if(width && height) {
		canvas.width = width;
		canvas.height = height;
		context.drawImage(video, 0, 0, width, height);


		canvas.parentNode.classList.add('camera__preview');
	} else {
		clearPhoto();
	}
}

function savePhoto() {
	const data = canvas.toDataURL('image/png');

	if(photoCallback) {
		photoCallback(data);
	}

	canvas.parentNode.classList.remove('camera__preview');
}

function rejectPhoto() {
	clearPhoto();
	canvas.parentNode.classList.remove('camera__preview');
}


export default setup;

