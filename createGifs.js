const fs = require("fs-extra");
const { createCanvas, loadImage } = require("canvas");
const GIFEncoder = require("gifencoder");

const targetWidth = 800; // Desired height
const repeat = 0; // 0 for repeat, -1 for no-repeat
const delay = 100; // Frame delay in milliseconds
const quality = 20; // Lower value for lower quality, makes it faster
const outputName = "test"; // Output GIF file name

// Path to the images folder
const imagesPath = "./images";

// Helper function to calculate the average color of an image
function getAverageColor(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let rTotal = 0,
    gTotal = 0,
    bTotal = 0;

  for (let i = 0; i < data.length; i += 4) {
    rTotal += data[i]; // Red
    gTotal += data[i + 1]; // Green
    bTotal += data[i + 2]; // Blue
  }

  const numPixels = data.length / 4;
  return {
    r: rTotal / numPixels,
    g: gTotal / numPixels,
    b: bTotal / numPixels,
  };
}

// Helper function to adjust the color of the image based on the target color
function adjustColor(ctx, width, height, targetColor, avgColor) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  const rFactor = targetColor.r / avgColor.r;
  const gFactor = targetColor.g / avgColor.g;
  const bFactor = targetColor.b / avgColor.b;

  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, data[i] * rFactor); // Adjust Red
    data[i + 1] = Math.min(255, data[i + 1] * gFactor); // Adjust Green
    data[i + 2] = Math.min(255, data[i + 2] * bFactor); // Adjust Blue
  }

  ctx.putImageData(imageData, 0, 0);
}

// Function to create a GIF from images with brightness and color normalization
async function createGifFromImages() {
  console.log("creating gif...");
  const startTime = process.hrtime();
  // Get the list of images in alphabetical order
  let files = await fs.readdir(imagesPath);

  // Filter only image files (adjust extensions as needed)
  files = files.filter((file) => /\.(jpe?g|png)$/.test(file)).sort();

  // Load the first image to determine the original size and set the target size
  const referenceImage = await loadImage(`${imagesPath}/${files[1]}`);
  const originalWidth = referenceImage.width;
  const originalHeight = referenceImage.height;

  // Set the target size (resize the images to reduce GIF size)
  const targetHeight = Math.floor(
    (targetWidth / originalWidth) * originalHeight
  ); // Maintain aspect ratio

  // Set up the GIF encoder with resized dimensions
  const encoder = new GIFEncoder(targetWidth, targetHeight);
  encoder
    .createReadStream()
    .pipe(fs.createWriteStream(`./output/${outputName}.gif`));

  encoder.start();
  encoder.setRepeat(repeat); // 0 for repeat, -1 for no-repeat
  encoder.setDelay(delay); // Lower frame delay (100ms for faster transitions)
  encoder.setQuality(quality); // Higher value for lower quality, makes it faster

  const canvas = createCanvas(targetWidth, targetHeight);
  const ctx = canvas.getContext("2d");

  // Limit the number of frames to speed up the process if needed
  const maxFrames = 50; // Maximum number of frames to include

  // Select a target frame for color normalization (you can choose a specific image or use the first one)
  ctx.drawImage(referenceImage, 0, 0, targetWidth, targetHeight);
  const targetColor = getAverageColor(ctx, targetWidth, targetHeight);

  // Loop through each image (limited to maxFrames) and add it to the GIF
  for (let i = 0; i < Math.min(files.length, maxFrames); i++) {
    const imagePath = `${imagesPath}/${files[i]}`;
    const image = await loadImage(imagePath);

    // Resize and draw the image on the canvas
    ctx.clearRect(0, 0, targetWidth, targetHeight); // Clear canvas before drawing new frame
    ctx.drawImage(image, 0, 0, targetWidth, targetHeight); // Resize image to fit target dimensions

    // Calculate the average brightness and color of the frame
    const avgColor = getAverageColor(ctx, targetWidth, targetHeight);

    // Adjust the color to match the target frame
    adjustColor(ctx, targetWidth, targetHeight, targetColor, avgColor);

    // Add the frame to the GIF
    encoder.addFrame(ctx);
  }

  encoder.finish(); // Finalize the GIF
  const elapsedTime = process.hrtime(startTime); // Get the elapsed time
  const elapsedMilliseconds = elapsedTime[0] * 1000 + elapsedTime[1] / 1e6; // Convert to milliseconds

  const stats = fs.statSync(`./output/${outputName}.gif`);
  const fileSizeInBytes = stats.size; // Size in bytes
  const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2); // Convert to KB with 2 decimal places

  console.log(`File location: ./output/${outputName}.gif`);
  console.log(
    `File size: ${fileSizeInKB} KB. Time elapsed: ${Math.floor(
      elapsedMilliseconds
    )}ms`
  );
}

// Call the function
createGifFromImages().catch(console.error);
