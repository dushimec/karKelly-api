import fs from 'fs/promises';
import path from 'path';

// Define the root directory of your project
const projectRoot = process.cwd(); // Automatically gets the current working directory
const documentationPath = path.join(projectRoot, 'DOCUMENTATION.md');

// Function to write the documentation content to a file
const writeDocumentation = async (content) => {
  await fs.writeFile(documentationPath, content);
  console.log(`Documentation generated at ${documentationPath}`);
};

// Function to generate the content for the documentation
const generateDocContent = async (dir, title) => {
  let content = `# ${title}\n\n`;
  content += '## Project Structure\n\n';
  content += '```plaintext\n';
  content += await generateFolderContent(dir);
  content += '```\n';
  return content;
};

// Function to read the first few lines of a file for description
const getFileDescription = async (filePath) => {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const lines = data.split('\n').filter(line => line.trim() !== '');
    return lines.slice(0, 2).join(' '); // Get the first 2 lines as description
  } catch (error) {
    console.error(`Error reading file ${filePath}:`, error);
    return 'No description available.'; // Fallback if reading fails
  }
};

// Function to generate the folder content recursively
const generateFolderContent = async (dir) => {
  let content = '';
  const items = await fs.readdir(dir);

  for (const item of items) {
    const itemPath = path.join(dir, item);
    const stats = await fs.stat(itemPath);

    if (stats.isDirectory()) {
      content += `📁 ${item}\n`;
      content += await generateFolderContent(itemPath); // Recursively get folder content
    } else {
      const relativePath = path.relative(projectRoot, itemPath); // Adjusted to show relative path
      const description = await getFileDescription(itemPath); // Get file description
      content += `  - 📄 **\`${relativePath}\`**: _${description}_\n`; // Include description
    }
  }

  return content;
};

// Function to generate documentation
const generateDocumentation = async () => {
  const appDocContent = await generateDocContent(path.join(projectRoot, 'src'), 'Project Documentation');

  // Write only app documentation
  await writeDocumentation(appDocContent);
};

// Execute the documentation generation
generateDocumentation().catch((error) => {
  console.error('Error generating documentation:', error);
});
