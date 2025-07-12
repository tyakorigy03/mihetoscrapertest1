const path = require('path');
const fs = require('fs');

const serieLinks = Array.from({ length: 15 }, (_, i) => 
  `https://agasobanuyelive.com/category/serie/page/${i + 1}/`
);

const movieLinks = Array.from({ length: 68 }, (_, i) => 
  `https://agasobanuyelive.com/category/movie/page/${i + 1}/`
);

// Interleave serie and movie links
const interleavedLinks = [];
const maxLength = Math.max(serieLinks.length, movieLinks.length);

for (let i = 0; i < maxLength; i++) {
  if (i < serieLinks.length) interleavedLinks.push(serieLinks[i]);
  if (i < movieLinks.length) interleavedLinks.push(movieLinks[i]);
}

const links = {
  agasobanuyelive: interleavedLinks
};

async function getPredefinedLinks(key) {
  return links[key] || [];
}

module.exports = { getPredefinedLinks };
