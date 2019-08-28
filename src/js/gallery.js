
class Gallery {

	constructor(target = '#gallery', options = {}) {
		// Convert target selector to element if it is a string
		this.target = typeof target === 'string'
			? document.querySelector(target)
			: target;

		this.maxCount = options.maxCount || 6;
		this.photos = [];
	}

	addPhoto(src) {
		this.photos.push(src);

		const image = new Image();
		image.addEventListener('load', () => {
			const data = {
				src,
				width: image.width,
				height: image.height,
				image
			};
			this.photos.push(data);
			this.showPhoto(data);
		});
		image.src = src;
	}

	/**
	 * Display the photo in the gallary
	 * @param {Object} photoData Available data on the image;
	 * @param {Image} photoData.image The image element to display
	 * @param {number} photoData.width Image width in pixels
	 * @param {number} photoData.height Image height in pixels
	 **/
	showPhoto(photoData) {
		const image = photoData.image;
		image.className = 'gallery__image';
		// Insert in first position
		if(this.target.children.length) {
			this.target.insertBefore(image, this.target.firstChild);

			// If we have reached max length remove the last element
			if(this.target.children.length > this.maxCount) {
				const last = this.target.children[this.target.children.length - 1];
				this.target.removeChild(last);
				
				// Remove refence to element now it is removed
				const lastIndex = this.photos.findIndex((photo) => photo.image === last);
				console.log('Index', lastIndex);
				if(lastIndex) {
					this.photos[lastIndex].image = null;
				}
			}
		} else {
			this.target.appendChild(image);
		}
		this.scalePhotos(photoData);
	}

	/**
	 * Scale the image width to match the current height
	 **/
	scalePhotos() {
		const activeImages = this.photos.filter((photo) => photo.image);
		const parentSize = this.target.getBoundingClientRect();

		// Reset sizes
		activeImages.forEach((photo) => {
			photo.image.width = photo.width;
			photo.image.height = photo.height;

			const scale = photo.width / photo.height;
			if(photo.image.width / photo.image.height !== scale) {
				// Fix scale
				const image = photo.image;
				image.height = parentSize.height;
				image.width = parentSize.height * scale;
			}

		});
	}
}

export default Gallery;
