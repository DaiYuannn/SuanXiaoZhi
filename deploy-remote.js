#!/usr/bin/env node
/**
 * 算小智 v2.1 - 远程部署脚本
 * 从项目 .env 读取应用配置，SSH 密码从命令行参数读取
 *
 * 用法: node deploy-remote.js <ssh-password>
 */
import { Client } from 'ssh2';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// SSH 连接参数
const HOST = '47.116.55.37';
const USER = 'root';
const sshPwd = process.argv[2];

if (!sshPwd) {
  console.error('用法: node deploy-remote.js <ssh-password>');
  process.exit(1);
}

const APP_PORT = 3000;
const REMOTE_DIR = '/root/suanxiaozhi';
const GIT_REPO = 'https://github.com/DaiYuannn/SuanXiaoZhi.git';

// 从项目 .env 读取应用配置
const envPath = resolve(__dirname, '.env');
let appEnvContent = '';
if (existsSync(envPath)) {
  appEnvContent = readFileSync(envPath, 'utf-8').trim();
  console.log('[OK] 已读取项目 .env 配置');
} else {
  console.error('[ERROR] 项目 .env 文件不存在');
  process.exit(1);
}

// 确保 PORT 正确
appEnvContent = appEnvContent.replace(/^PORT=.*$/m, `PORT=${APP_PORT}`);
if (!appEnvContent.includes('PORT=')) {
  appEnvContent += `\nPORT=${APP_PORT}`;
}
appEnvContent = appEnvContent.replace(/^NODE_ENV=.*$/m, 'NODE_ENV=production');
if (!appEnvContent.includes('NODE_ENV=')) {
  appEnvContent = 'NODE_ENV=production\n' + appEnvContent;
}

// === SSH 工具函数 ===
function execCmd(conn, cmd, timeout = 120000) {
  return new Promise((resolve, reject) => {
    console.log(`  $ ${cmd.length > 130 ? cmd.slice(0, 130) + '...' : cmd}`);
    const timer = setTimeout(() => reject(new Error(`超时: ${cmd.slice(0, 80)}`)), timeout);
    conn.exec(cmd, (err, stream) => {
      if (err) { clearTimeout(timer); return reject(err); }
      let stdout = '', stderr = '';
      stream.on('data', (d) => { stdout += d.toString(); });
      stream.stderr.on('data', (d) => { stderr += d.toString(); });
      stream.on('close', () => {
        clearTimeout(timer);
        if (stdout.trim()) console.log(`    ${stdout.trim().slice(0, 800)}`);
        if (stderr.trim() && !stderr.includes('WARN') && !stderr.includes('notice'))
          console.log(`    [stderr] ${stderr.trim().slice(0, 300)}`);
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      });
    });
  });
}

function doConnect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => { console.log('[OK] SSH 已连接\n'); resolve(conn); });
    conn.on('error', (err) => reject(err));
    conn.connect({ host: HOST, port: 22, username: USER, password: sshPwd, readyTimeout: 15000 });
  });
}

async function main() {
  console.log(`=== 算小智 v2.1 → ${HOST}:${APP_PORT} ===\n`);

  const conn = await doConnect();

  try {
    // ---- [1/5] PostgreSQL ----
    console.log('[1/5] PostgreSQL 数据库...');
    let { stdout: pg } = await execCmd(conn, 'systemctl is-active postgresql 2>&1 || echo NO', 5000);
    if (!pg.includes('active')) {
      console.log('  安装 PostgreSQL...');
      await execCmd(conn, 'apt-get update -qq && apt-get install -y -qq postgresql postgresql-client 2>&1', 120000);
      await execCmd(conn, 'systemctl start postgresql && systemctl enable postgresql 2>&1', 30000);
    }
    console.log(`  PostgreSQL: ${pg.includes('active') ? '运行中' : '已启动'}`);

    await execCmd(conn, `sudo -u postgres psql -c "CREATE USER suanxiaozhi WITH PASSWORD 'suanxiaozhi123'" 2>&1; true`, 10000);
    await execCmd(conn, `sudo -u postgres psql -c "CREATE DATABASE suanxiaozhi OWNER suanxiaozhi" 2>&1; true`, 10000);
    await execCmd(conn, `sudo -u postgres psql -d suanxiaozhi -c "GRANT ALL ON SCHEMA public TO suanxiaozhi" 2>&1`, 10000);
    console.log('  [OK] 数据库就绪\n');

    // ---- [2/5] Git Clone ----
    console.log('[2/5] Git 拉取项目...');
    await execCmd(conn, `rm -rf ${REMOTE_DIR}`);
    const { stdout: cloneOut } = await execCmd(conn,
      `cd /root && GIT_SSL_NO_VERIFY=1 git clone ${GIT_REPO} suanxiaozhi 2>&1`,
      120000
    );
    const { stdout: check } = await execCmd(conn,
      `test -f ${REMOTE_DIR}/package.json && echo OK || echo FAIL`, 5000
    );
    if (check.includes('FAIL')) throw new Error('Git clone 失败');
    console.log('  [OK] 代码拉取完成\n');

    // ---- [3/5] Node.js & pnpm ----
    console.log('[3/5] Node.js & pnpm...');
    let { stdout: nv } = await execCmd(conn, 'node -v 2>&1 || echo NO', 5000);
    if (nv.includes('NO')) {
      console.log('  安装 Node.js 20.x...');
      await execCmd(conn, 'curl -fsSL https://deb.nodesource.com/setup_20.x | bash - 2>&1', 60000);
      await execCmd(conn, 'apt-get install -y nodejs 2>&1', 60000);
      nv = (await execCmd(conn, 'node -v', 5000)).stdout;
    }
    console.log(`  Node.js: ${nv}`);

    let { stdout: pv } = await execCmd(conn, 'which pnpm && pnpm -v || echo NO', 5000);
    if (pv.includes('NO')) {
      console.log('  安装 pnpm...');
      await execCmd(conn, 'npm install -g pnpm 2>&1', 60000);
      pv = (await execCmd(conn, 'pnpm -v', 5000)).stdout;
    }
    console.log(`  pnpm: ${pv}\n`);

    // ---- [4/5] 安装 & 构建 ----
    console.log('[4/5] 安装依赖 & 构建...');

    // 上传 .env
    // Escape the .env content for bash heredoc
    const escapedEnv = appEnvContent.replace(/\\/g, '\\\\').replace(/'/g, "'\\''");
    await execCmd(conn, `cat > ${REMOTE_DIR}/.env << 'ENVEOF'\n${appEnvContent}\nENVEOF`, 5000);
    console.log('  [OK] .env 已部署');

    await execCmd(conn, `cd ${REMOTE_DIR} && pnpm install 2>&1`, 300000);
    console.log('  [OK] 依赖安装完成');

    await execCmd(conn, `cd ${REMOTE_DIR} && npx prisma generate --schema server/prisma/schema.prisma 2>&1`, 60000);

    const dbUrl = 'postgresql://suanxiaozhi:suanxiaozhi123@localhost:5432/suanxiaozhi?schema=public';
    await execCmd(conn, `cd ${REMOTE_DIR} && DATABASE_URL='${dbUrl}' npx prisma db push --schema server/prisma/schema.prisma 2>&1`, 60000);
    console.log('  [OK] 数据库表同步');

    await execCmd(conn, `cd ${REMOTE_DIR} && pnpm build 2>&1`, 180000);
    console.log('  [OK] 构建完成\n');

    // ---- [5/5] 启动 ----
    console.log('[5/5] 启动服务...');
    await execCmd(conn, `pkill -f 'tsx server' 2>/dev/null || true; sleep 1`, 10000);
    await execCmd(conn, `ufw allow ${APP_PORT}/tcp 2>/dev/null; iptables -I INPUT -p tcp --dport ${APP_PORT} -j ACCEPT 2>/dev/null; echo done`, 5000);
    await execCmd(conn, `cd ${REMOTE_DIR} && nohup pnpm start > /tmp/server.log 2>&1 & sleep 3; pgrep -f 'tsx server' && echo RUNNING || echo NOT`, 20000);

    const { stdout: http } = await execCmd(conn, `sleep 2 && curl -s -o /dev/null -w '%{http_code}' http://localhost:${APP_PORT}/ 2>&1`, 15000);
    console.log(`\n  HTTP 状态码: ${http || '无响应'}`);

    const { stdout: log } = await execCmd(conn, 'tail -30 /tmp/server.log 2>&1', 5000);
    if (log) console.log(`\n  服务器日志:\n${log}`);

    conn.end();
    console.log(`\n=== 部署完成 ===`);
    console.log(`  http://${HOST}:${APP_PORT}`);

  } catch (err) {
    console.error(`\n[错误] ${err.message}`);
    try { conn.end(); } catch {}
    process.exit(1);
  }
}

main();
