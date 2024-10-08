import axios from 'axios';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { execSync } from 'child_process';

// Convert import.meta.url to a file path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const urls = [
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(0)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(1)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(2)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(3)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(4)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(5)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=003&dia=${generateDate(6)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(0)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(1)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(2)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(3)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(4)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(5)}`,
  `https://www.cinetecanacional.net/sedes/cartelera.php?cinemaId=002&dia=${generateDate(6)}`
];

function generateDate(offset) {
  const today = new Date();
  const targetDate = new Date(today.getTime() + offset * 24 * 60 * 60 * 1000);
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const day = String(targetDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

async function fetchMovieData(url) {
  try {
    const response = await axios.get(url);
    const dom = new JSDOM(response.data);
    const movieElements = dom.window.document.querySelectorAll(".col-12.col-md-6.col-lg-4.float-left");

    const movies = [];
    movieElements.forEach((element) => {
      const anchorElement = element.children[0];
      const filmid = anchorElement.href.match(/FilmId=([^&]+)/)?.[1] || "";

      const movie = element.children[1].querySelector("p")?.textContent?.trim() || "";

      const infoText = element.querySelector("div.small")?.textContent?.trim() || "";
      const [int_name, dir, pais, year, dur] = parseMovieInfo(infoText);

      const dateString = element.children[3].children[1].textContent?.trim() || "";
      const date = format(parse(dateString, "EEEE d 'de' MMMM 'de' yyyy", new Date(), { locale: es }), 'dd/MM/yyyy');

      const salaElement = element.children[3];
      let sala = salaElement.childNodes[5]?.textContent?.trim() || "";
      sala = sala.endsWith(":") ? sala.slice(0, -1) : sala;

      const times = Array.from(salaElement.querySelectorAll("a")).map(a => a.textContent?.trim() || "");

      movies.push({
        filmid,
        movie,
        int_name,
        dir,
        pais,
        year: parseInt(year),
        dur: dur.replace(/\D/g, ''),
        date,
        sala,
        times,
      });
    });

    return movies;
  } catch (error) {
    console.error('Error fetching movie data:', error);
    throw error;
  }
}

function parseMovieInfo(infoText) {
  const int_name = infoText.match(/\(([^,]+)/)?.[1]?.trim() || "";
  const dir = infoText.match(/Dir\.: ([^,]+)/)?.[1]?.trim() || "";
  const pais = infoText.match(/, ([^,]+), (\d{4}),/i)?.[1]?.trim() || "";
  const year = infoText.match(/(\d{4})/)?.[0]?.trim() || "";
  const dur = infoText.match(/Dur\.: ([^)]+)\)/)?.[1]?.trim() || "";

  return [int_name, dir, pais, year, dur];
}


function writeJSONFile(movies, cinemaId, date) {
  const outputDir = path.join(__dirname, 'output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const [year, month, day] = date.split('-');
  const filePath = path.join(outputDir, `${cinemaId}-${year}-${month}-${day}.json`);

  // Ensure the file exists, or create it
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '[]');
  }

  fs.writeFileSync(filePath, JSON.stringify(movies, null, 2));
  console.log(`Movie data has been written to ${filePath}`);

  // Add the file to be committed later
  gitAddFile(filePath);
}

function gitAddFile(filePath) {
  try {
    const gitAddCommand = `git add ${filePath}`;
    console.log(`Running command: ${gitAddCommand}`);
    execSync(gitAddCommand, { stdio: 'inherit' });
  } catch (error) {
    console.error(`Error adding file ${filePath} to Git:`, error.message);
    console.error('Stack Trace:', error.stack);
  }
}

async function main() {
  let changesMade = false;
  for (const url of urls) {
    const cinemaIdMatch = url.match(/cinemaId=(\d+)/);
    const dateMatch = url.match(/dia=(\d{4}-\d{2}-\d{2})/);

    if (cinemaIdMatch && dateMatch) {
      const cinemaId = cinemaIdMatch[1];
      const date = dateMatch[1];

      const movies = await fetchMovieData(url);
      writeJSONFile(movies, cinemaId, date);
      changesMade = true;
    }
  }

  if (changesMade) {
    console.log("Changes detected and committed.");
  } else {
    console.log("No changes were made.");
  }
}

main();