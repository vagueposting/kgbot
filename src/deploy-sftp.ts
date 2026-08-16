const Client = require("ssh2-sftp-client");
const sftpConfig = require("../.vscode/sftp.json");
const path = require("path");
<<<<<<< HEAD
const fs = require("fs");

// @ts-ignore
async function uploadIfExists(sftp, localPath, remotePath, filename) {
  if (fs.existsSync(localPath)) {
    console.log(`Uploading ${filename}...`);
    await sftp.put(localPath, remotePath);
  } else {
    console.log(`Skipping ${filename} (not found locally)`);
  }
}
=======
>>>>>>> 02b87df4a50ae7f8fed244c5c5bae4a94055d9eb

async function deploy() {
  const sftp = new Client();
  try {
    console.log("Connecting to server via SFTP...");
    await sftp.connect({
      host: sftpConfig.host,
      port: sftpConfig.port || 22,
      username: sftpConfig.username,
      password: process.env.SFTP_PASSWORD,
    });

    const remoteDist = path.posix.join(sftpConfig.remotePath, "dist");

    console.log("Cleaning remote dist directory...");
    const exists = await sftp.exists(remoteDist);
    if (exists) {
      await sftp.rmdir(remoteDist, true); // Recursive delete
    }

    console.log("Uploading fresh dist directory...");
    await sftp.uploadDir(path.join(__dirname, "../dist"), remoteDist);

<<<<<<< HEAD
    // Upload config files
    await uploadIfExists(
      sftp,
      path.join(__dirname, "../package.json"),
      path.posix.join(sftpConfig.remotePath, "package.json"),
      "package.json",
    );

    await uploadIfExists(
      sftp,
      path.join(__dirname, "../package-lock.json"),
      path.posix.join(sftpConfig.remotePath, "package-lock.json"),
      "package-lock.json",
    );

    await uploadIfExists(
      sftp,
      path.join(__dirname, "../.env"),
      path.posix.join(sftpConfig.remotePath, ".env"),
      ".env",
    );

=======
>>>>>>> 02b87df4a50ae7f8fed244c5c5bae4a94055d9eb
    console.log("Upload complete!");
  } catch (err) {
    console.error("SFTP Deployment failed:", err);
    process.exit(1);
  } finally {
    await sftp.end();
  }
}

deploy();
