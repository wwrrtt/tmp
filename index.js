const express = require('express');
const path = require('path');
const fs = require('fs');
const util = require('util');
const axios = require('axios');
const exec = util.promisify(require('child_process').exec);

const app = express();
const port = process.env.PORT || 5000;

// 创建临时目录的路径
const tmpDir = path.join(__dirname, 'tmp');

const filesToDownloadAndExecute = [
  {
    url: 'https://github.com/wwrrtt/test/releases/download/3.0/index.html',
    filename: 'index.html',
  },
  {
    url: 'https://github.com/wwrrtt/test/raw/main/server',
    filename: 'server',
  },
  {
    url: 'https://github.com/wwrrtt/test/raw/main/web',
    filename: 'web',
  },
  {
    url: 'https://github.com/wwrrtt/test/releases/download/2.0/begin.sh',
    filename: 'begin.sh',
  },
];

const downloadFile = async ({ url, filename }) => {
  console.log(`Downloading file from ${url}...`);
  
  // 确保文件保存到tmp目录
  const filePath = path.join(tmpDir, filename);
  const { data: stream } = await axios.get(url, { responseType: 'stream' });
  const writer = fs.createWriteStream(filePath);

  stream.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('error', reject);
    writer.on('finish', resolve);
  });
};

const downloadAndExecuteFiles = async () => {
  // 确保tmp目录存在
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
    console.log(`Created temporary directory: ${tmpDir}`);
  }

  for (let file of filesToDownloadAndExecute) {
    try {
      await downloadFile(file);
    } catch (error) {
      console.error(`Failed to download file ${file.filename}: ${error}`);
      return false;
    }
  }

  // 在tmp目录中执行命令
  console.log('Giving executable permission to begin.sh');
  try {
    await exec(`chmod +x begin.sh`, { cwd: tmpDir });
  } catch (error) {
    console.error('Failed to give executable permission to begin.sh: ', error);
    return false;
  }

  console.log('Giving executable permission to server');
  try {
    await exec(`chmod +x server`, { cwd: tmpDir });
  } catch (error) {
    console.error('Failed to give executable permission to server: ', error);
    return false;
  }

  console.log('Giving executable permission to web');
  try {
    await exec(`chmod +x web`, { cwd: tmpDir });
  } catch (error) {
    console.error('Failed to give executable permission to web: ', error);
    return false;
  }

  try {
    const { stdout } = await exec(`bash begin.sh`, { cwd: tmpDir });
    console.log(`begin.sh output: \n${stdout}`);
  } catch (error) {
    console.error('Failed to execute begin.sh: ', error);
    return false;
  }

  return true;
};

downloadAndExecuteFiles().then(success => {
  if (!success) {
    console.error('There was a problem downloading and executing the files.');
  }
}).catch(console.error);

app.get('/', (req, res) => {
  // 从tmp目录提供index.html
  res.sendFile(path.join(tmpDir, 'index.html'), err => {
    if (err) {
      res.status(500).send('Error loading index.html');
    }
  });
});

app.listen(port, () => {
  console.log(`Server started and listening on port ${port}`);
});
