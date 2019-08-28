
const dbName = 'photos';
const dbVersion = 1;
const photoStore = 'photos';

let connected = null;

function connect() {
	if(connected) {
		return connected;
	}

	connected = new Promise((resolve, reject) => {
		const conn = indexedDB.open(dbName, dbVersion);

		conn.addEventListener('success', (evt) => {
	
			const db = evt.target.result;
			resolve(evt.target.result);
		});

		conn.addEventListener('error', (evt) => reject(evt.target.error));

		conn.addEventListener('upgradeneeded', (evt) => {
			const db = evt.target.result;
			const objectStore = db.createObjectStore(
				photoStore,
				{
					keyPath: "id",
					autoIncrement: true
				}
			);
		});
	});
	return connected;
}

function getAllPhotos() {
	return connect()
		.then((db) => {
			return new Promise((resolve, reject) => {
				console.log('Get all photos');
				const photos = [];
				const store = db.transaction([photoStore]).objectStore(photoStore);
				var cursor = store.openCursor();
				cursor.addEventListener('success', (evt) => {
					var thisCursor = evt.target.result;
					if(thisCursor) {
						const data = thisCursor.value;
						photos.push(data.src);
						thisCursor.continue();
					} else {
						resolve(photos);
					}
				});

				cursor.addEventListener('error', (evt) => reject(evt.target.error));
			});
		});
}

function savePhoto(src) {
	return connect()
		.then((db) => {
			return new Promise((resolve, reject) => {
				const transaction = db.transaction([photoStore], 'readwrite');
				const objectStore = transaction.objectStore(photoStore);
				const request = objectStore.add({
					src
				});
				request.addEventListener('success', (evt) => resolve(evt.target.result));
				request.addEventListener('error', (evt) => resolve(evt.target.error));
			});
		});
}

export {
	connect,
	getAllPhotos,
	savePhoto
};
