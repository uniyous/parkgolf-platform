import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupEmptyClubs() {
  console.log('Starting cleanup of clubs without holes data...\n');

  // 1. holes가 없는 코스를 가진 클럽들 조회
  const clubsWithCourses = await prisma.club.findMany({
    include: {
      courses: {
        include: {
          holes: true,
        },
      },
      games: {
        include: {
          timeSlots: true,
          weeklySchedules: true,
        },
      },
    },
  });

  console.log(`Total clubs: ${clubsWithCourses.length}`);

  // 2. 모든 코스에 holes가 없는 클럽 찾기
  const clubsToDelete = clubsWithCourses.filter(club => {
    // 코스가 없거나, 모든 코스에 holes가 없는 경우
    if (club.courses.length === 0) return true;
    return club.courses.every(course => course.holes.length === 0);
  });

  console.log(`Clubs to delete (no holes): ${clubsToDelete.length}`);

  if (clubsToDelete.length === 0) {
    console.log('No clubs to delete.');
    return;
  }

  // 3. 삭제할 클럽 ID 목록
  const clubIdsToDelete = clubsToDelete.map(c => c.id);
  console.log('Club IDs to delete:', clubIdsToDelete);

  // 4. 트랜잭션으로 삭제 실행
  await prisma.$transaction(async (tx) => {
    // 4.1 GameTimeSlot 삭제
    const deletedTimeSlots = await tx.gameTimeSlot.deleteMany({
      where: {
        game: {
          clubId: { in: clubIdsToDelete },
        },
      },
    });
    console.log(`Deleted GameTimeSlots: ${deletedTimeSlots.count}`);

    // 4.2 GameWeeklySchedule 삭제
    const deletedSchedules = await tx.gameWeeklySchedule.deleteMany({
      where: {
        game: {
          clubId: { in: clubIdsToDelete },
        },
      },
    });
    console.log(`Deleted GameWeeklySchedules: ${deletedSchedules.count}`);

    // 4.3 Game 삭제
    const deletedGames = await tx.game.deleteMany({
      where: {
        clubId: { in: clubIdsToDelete },
      },
    });
    console.log(`Deleted Games: ${deletedGames.count}`);

    // 4.4 Course 삭제 (holes가 없으므로 바로 삭제 가능)
    const deletedCourses = await tx.course.deleteMany({
      where: {
        clubId: { in: clubIdsToDelete },
      },
    });
    console.log(`Deleted Courses: ${deletedCourses.count}`);

    // 4.5 Club 삭제
    const deletedClubs = await tx.club.deleteMany({
      where: {
        id: { in: clubIdsToDelete },
      },
    });
    console.log(`Deleted Clubs: ${deletedClubs.count}`);
  });

  console.log('\nCleanup completed successfully!');
}

cleanupEmptyClubs()
  .catch((e) => {
    console.error('Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
