import { cpus, totalmem, freemem } from 'os';

const MILLISECOND = 1 / 1e3;
const MICROSECOND = 1 / 1e6;

let prevOsData = {
  time: Date.now(),
  cpus: cpus(),
};

export function getCpuUsageData(): Array<{
  cpuNumber: string;
  idle: number;
  user: number;
  system: number;
  interrupt: number;
  nice: number;
  userP: number;
  systemP: number;
  idleP: number;
  interruptP: number;
  niceP: number;
}> {
  const currentTime = Date.now();
  const timeElapsed = currentTime - prevOsData.time;
  const currentOsData = { time: currentTime, cpus: cpus() };

  const usageData = currentOsData.cpus.map((cpu, cpuNumber) => {
    const prevTimes = prevOsData.cpus[cpuNumber].times;
    const currTimes = cpu.times;

    const idle = currTimes.idle * MILLISECOND;
    const user = currTimes.user * MILLISECOND;
    const system = currTimes.sys * MILLISECOND;
    const interrupt = currTimes.irq * MILLISECOND;
    const nice = currTimes.nice * MILLISECOND;

    const idleP = (currTimes.idle - prevTimes.idle) / timeElapsed;
    const userP = (currTimes.user - prevTimes.user) / timeElapsed;
    const systemP = (currTimes.sys - prevTimes.sys) / timeElapsed;
    const interruptP = (currTimes.irq - prevTimes.irq) / timeElapsed;
    const niceP = (currTimes.nice - prevTimes.nice) / timeElapsed;

    return {
      cpuNumber: String(cpuNumber),
      idle,
      user,
      system,
      interrupt,
      nice,
      userP,
      systemP,
      idleP,
      interruptP,
      niceP,
    };
  });

  prevOsData = currentOsData;

  return usageData;
}

let prevProcData = {
  time: Date.now(),
  usage: process.cpuUsage(),
};

export function getProcessCpuUsageData(): {
  user: number;
  system: number;
  userP: number;
  systemP: number;
} {
  const currentTime = Date.now();
  const currentUsage = process.cpuUsage();
  const prevUsage = prevProcData.usage;
  const timeElapsed = (currentTime - prevProcData.time) * 1000;
  const cpusTimeElapsed = timeElapsed * prevOsData.cpus.length;

  const user = currentUsage.user * MICROSECOND;
  const system = currentUsage.system * MICROSECOND;
  const userP = (currentUsage.user - prevUsage.user) / cpusTimeElapsed;
  const systemP = (currentUsage.system - prevUsage.system) / cpusTimeElapsed;

  prevProcData = { time: currentTime, usage: currentUsage };

  return {
    user,
    system,
    userP,
    systemP,
  };
}

export function getMemoryData(): {
  used: number;
  free: number;
  usedP: number;
  freeP: number;
} {
  const total = totalmem();
  const free = freemem();
  const used = total - free;
  const freeP = free / total;
  const usedP = used / total;

  return {
    used,
    free,
    usedP,
    freeP,
  };
}

export function getProcessMemoryData(): number {
  if (process.memoryUsage().rss) {
    return process.memoryUsage().rss;
  }
  return 0;
}
