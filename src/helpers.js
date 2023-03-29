/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from 'fs';
import * as relativePath from 'path';

export const loadJSON = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), 'utf-8'));

export const updateTokenListJson = async (data, path) => {
  fs.writeFile(
    new URL(path, import.meta.url),
    JSON.stringify(data),
    "\t",
    function (err) {
      if (err) throw err;
      console.log('complete');
    }
  );
};

export const __dirname = relativePath
  .dirname(import.meta.url)
  .split('/')
  .slice(0, -1)
  .join('/');

export const generateImage = async (base64String, path) => {
  let base64Image = base64String.split(';base64,').pop();
  fs.writeFile(
    new URL(path, __dirname + '/'),
    base64Image,
    { encoding: 'base64', recursive: true },
    function () {
      console.log('File created');
    }
  );
};


