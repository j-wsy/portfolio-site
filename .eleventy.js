const { DateTime } = require("luxon");

module.exports = function(eleventyConfig) {
  // Allow copying CSS
  eleventyConfig.addPassthroughCopy("src/style.css");

  // ✅ Add the date filter
  eleventyConfig.addFilter("date", (value, format = "dd MMM yyyy") => {
    return DateTime.fromJSDate(value).toFormat(format);
  });

  // Allow pass through assets
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: "src",
      includes: "_includes",
      output: "_site"
    }
  };
};