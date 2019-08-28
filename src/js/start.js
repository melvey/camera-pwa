import 'whatwg-fetch';
import camera from './camera';
import Gallery from './gallery';

const gallery = new Gallery();

function photoCallback(photo) {
	gallery.addPhoto(photo);
}

camera({callback: photoCallback});

