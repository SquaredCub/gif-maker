const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");
const GIFEncoder = require("gifencoder");

// Path to the images folder
const imagesPath = "./images";

// Function to create a GIF from images
async function createGifFromImages() {
  // Get the list of images in alphabetical order
  let files = await fs.readdir(imagesPath);

  // Filter only image files (adjust extensions as needed)
  files = files.filter((file) => /\.(jpe?g|png)$/.test(file)).sort();

  // Load the first image to determine the original size and set the target size
  const firstImage = await loadImage(`${imagesPath}/${files[0]}`);
  const originalWidth = firstImage.width;
  const originalHeight = firstImage.height;

  // Set the target size (resize the images to reduce GIF size)
  const targetWidth = 400; // Desired width
  const targetHeight = Math.floor(
    (targetWidth / originalWidth) * originalHeight
  ); // Maintain aspect ratio

  // Set up the GIF encoder with resized dimensions
  const encoder = new GIFEncoder(targetWidth, targetHeight);
  encoder.createReadStream().pipe(fs.createWriteStream("./output.gif"));

  encoder.start();
  encoder.setRepeat(0); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(100); // Lower frame delay (100ms for faster transitions)
  encoder.setQuality(20); // Higher value for lower quality, makes it faster

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");

  // Limit the number of frames to speed up the process if needed
  const maxFrames = 50; // Maximum number of frames to include

  // Loop through each image (limited to maxFrames) and add it to the GIF
  for (let i = 0; i < Math.min(files.length, maxFrames); i++) {
    const imagePath = `${imagesPath}/${files[i]}`;
    const image = await loadImage(imagePath);

    // Resize and draw the image on the canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight); // Clear canvas before drawing new frame
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight); // Resize image to fit target dimensions

    // Add the frame to the GIF
    encoder.addFrame(ctx);
  }

  encoder.finish(); // Finalize the GIF
  console.log("GIF created as output.gif");
}

// Call the function
createGifFromImages().catch(console.error);
