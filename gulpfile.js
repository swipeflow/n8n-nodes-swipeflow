const path = require('path');
const fs = require('fs');
const { task, src, dest } = require('gulp');

task('build:icons', copyIcons);

function copyIcons(cb) {
	const svgSource = path.resolve('*.svg');
	const credDestination = path.resolve('dist', 'credentials');
	const nodesRoot = path.resolve('dist', 'nodes');

	// Add credentials destination
	const destinations = [credDestination];

	// Add nodes destinations
	if (fs.existsSync(nodesRoot)) {
		const entries = fs.readdirSync(nodesRoot, { withFileTypes: true });
		for (const entry of entries) {
			if (entry.isDirectory()) {
				destinations.push(path.join(nodesRoot, entry.name));
			}
		}
	}

	// Copy to all destinations and wait for all to finish
	Promise.all(destinations.map(destDir => {
		return new Promise((resolve, reject) => {
			src(svgSource).pipe(dest(destDir)).on('end', resolve).on('error', reject);
		});
	})).then(() => cb()).catch(cb);
}
