import { prisma } from "../src/db";

async function checkTestAlerts() {
  // First, check ALL alerts
  const allAlerts = await prisma.alertLog.findMany({
    orderBy: {
      deliveredAt: "desc",
    },
    take: 10,
    select: {
      id: true,
      alertType: true,
      alertKey: true,
      deliveredAt: true,
      acknowledgedAt: true,
      createdAt: true,
      severity: true,
    },
  });

  console.log("Found", allAlerts.length, "total alert entries:");
  console.log("");

  allAlerts.forEach((alert, i) => {
    console.log(`Alert ${i + 1}:`);
    console.log(`  ID: ${alert.id}`);
    console.log(`  Alert Type: ${alert.alertType}`);
    console.log(`  Alert Key: ${alert.alertKey}`);
    console.log(`  Severity: ${alert.severity}`);
    console.log(`  Delivered At: ${alert.deliveredAt.toISOString()}`);
    console.log(`  Acknowledged At: ${alert.acknowledgedAt?.toISOString() || "null"}`);
    console.log(`  Created At: ${alert.createdAt.toISOString()}`);

    if (i > 0) {
      const prevAlert = allAlerts[i - 1];
      const diffMs = prevAlert.deliveredAt.getTime() - alert.deliveredAt.getTime();
      const diffSeconds = diffMs / 1000;
      console.log(`  Time since previous alert: ${diffSeconds.toFixed(2)} seconds`);
    }
    console.log("");
  });

  // Group by alert type
  const byType: Record<string, number> = {};
  allAlerts.forEach(alert => {
    byType[alert.alertType] = (byType[alert.alertType] || 0) + 1;
  });

  console.log("By alert type:");
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  await prisma.$disconnect();
}

checkTestAlerts();
