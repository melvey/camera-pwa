import 'whatwg-fetch';
import camera from './camera';
import Gallery from './gallery';
import {connect, savePhoto, getAllPhotos} from './storage';

const gallery = new Gallery();

connect()
	.then(() => getAllPhotos())
	.then((photos) => photos.forEach((photo) => gallery.addPhoto(photo)))
	.catch((err) => console.error(err));


function photoCallback(photo) {
	gallery.addPhoto(photo);
	savePhoto(photo);
}

camera({callback: photoCallback});

