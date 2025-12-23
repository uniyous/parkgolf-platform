import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 게임 캐시 데이터 생성
  const games = [
    {
      gameId: 1,
      name: 'A+B 코스',
      code: 'AB',
      description: 'A코스(전반 9홀)와 B코스(후반 9홀) 조합',
      frontNineCourseId: 1,
      frontNineCourseName: 'A 코스',
      backNineCourseId: 2,
      backNineCourseName: 'B 코스',
      totalHoles: 18,
      estimatedDuration: 180,
      breakDuration: 10,
      maxPlayers: 4,
      basePrice: 80000,
      weekendPrice: 100000,
      holidayPrice: 120000,
      clubId: 1,
      clubName: '그린밸리 파크골프클럽',
      isActive: true
    },
    {
      gameId: 2,
      name: 'C+D 코스',
      code: 'CD',
      description: 'C코스(전반 9홀)와 D코스(후반 9홀) 조합',
      frontNineCourseId: 3,
      frontNineCourseName: 'C 코스',
      backNineCourseId: 4,
      backNineCourseName: 'D 코스',
      totalHoles: 18,
      estimatedDuration: 180,
      breakDuration: 10,
      maxPlayers: 4,
      basePrice: 65000,
      weekendPrice: 85000,
      holidayPrice: 100000,
      clubId: 1,
      clubName: '그린밸리 파크골프클럽',
      isActive: true
    },
    {
      gameId: 3,
      name: 'A+C 코스',
      code: 'AC',
      description: 'A코스(전반 9홀)와 C코스(후반 9홀) 조합',
      frontNineCourseId: 1,
      frontNineCourseName: 'A 코스',
      backNineCourseId: 3,
      backNineCourseName: 'C 코스',
      totalHoles: 18,
      estimatedDuration: 180,
      breakDuration: 10,
      maxPlayers: 4,
      basePrice: 75000,
      weekendPrice: 95000,
      holidayPrice: 110000,
      clubId: 1,
      clubName: '그린밸리 파크골프클럽',
      isActive: true
    }
  ];

  // 게임 캐시 생성
  for (const game of games) {
    await prisma.gameCache.upsert({
      where: { gameId: game.gameId },
      update: game,
      create: game
    });
    console.log(`✅ Game cache created: ${game.name}`);
  }

  // 게임 타임슬롯 캐시 데이터 생성 (오늘부터 7일간)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let slotIdCounter = 1;

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    for (const game of games) {
      // 06:00 ~ 18:00 까지 시간대
      for (let hour = 6; hour < 18; hour++) {
        const startTime = `${hour.toString().padStart(2, '0')}:00`;
        const endHour = hour + 3; // 3시간 게임
        const endTime = `${endHour.toString().padStart(2, '0')}:00`;
        const isPremium = hour >= 9 && hour <= 14;
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        const price = isPremium
          ? (isWeekend ? game.weekendPrice! : game.basePrice * 1.2)
          : (isWeekend ? game.weekendPrice! * 0.8 : game.basePrice);

        await prisma.gameTimeSlotCache.upsert({
          where: { gameTimeSlotId: slotIdCounter },
          update: {
            gameId: game.gameId,
            gameName: game.name,
            gameCode: game.code,
            frontNineCourseName: game.frontNineCourseName,
            backNineCourseName: game.backNineCourseName,
            clubId: game.clubId,
            clubName: game.clubName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            maxPlayers: game.maxPlayers,
            bookedPlayers: 0,
            availablePlayers: game.maxPlayers,
            isAvailable: true,
            price: price,
            isPremium: isPremium,
            status: 'AVAILABLE'
          },
          create: {
            gameTimeSlotId: slotIdCounter,
            gameId: game.gameId,
            gameName: game.name,
            gameCode: game.code,
            frontNineCourseName: game.frontNineCourseName,
            backNineCourseName: game.backNineCourseName,
            clubId: game.clubId,
            clubName: game.clubName,
            date: date,
            startTime: startTime,
            endTime: endTime,
            maxPlayers: game.maxPlayers,
            bookedPlayers: 0,
            availablePlayers: game.maxPlayers,
            isAvailable: true,
            price: price,
            isPremium: isPremium,
            status: 'AVAILABLE'
          }
        });
        slotIdCounter++;
      }
    }
    console.log(`✅ Game time slots created for ${date.toISOString().split('T')[0]}`);
  }

  // 샘플 예약 데이터 생성
  const sampleBookings = [
    {
      gameTimeSlotId: 1,
      gameId: 1,
      gameName: 'A+B 코스',
      gameCode: 'AB',
      frontNineCourseId: 1,
      frontNineCourseName: 'A 코스',
      backNineCourseId: 2,
      backNineCourseName: 'B 코스',
      clubId: 1,
      clubName: '그린밸리 파크골프클럽',
      bookingDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), // 내일
      startTime: '09:00',
      endTime: '12:00',
      userId: 1,
      playerCount: 2,
      pricePerPerson: 80000,
      serviceFee: 4800,
      totalPrice: 164800,
      paymentMethod: 'card',
      bookingNumber: `BK-${Date.now().toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      userEmail: 'user1@example.com',
      userName: '김골프',
      userPhone: '010-1234-5678'
    },
    {
      gameTimeSlotId: 2,
      gameId: 2,
      gameName: 'C+D 코스',
      gameCode: 'CD',
      frontNineCourseId: 3,
      frontNineCourseName: 'C 코스',
      backNineCourseId: 4,
      backNineCourseName: 'D 코스',
      clubId: 1,
      clubName: '그린밸리 파크골프클럽',
      bookingDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 모레
      startTime: '14:00',
      endTime: '17:00',
      userId: 2,
      playerCount: 4,
      pricePerPerson: 78000,
      serviceFee: 9360,
      totalPrice: 321360,
      paymentMethod: 'kakaopay',
      bookingNumber: `BK-${(Date.now() + 1000).toString().slice(-8)}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      userEmail: 'user2@example.com',
      userName: '이골프',
      userPhone: '010-2345-6789'
    }
  ];

  for (const booking of sampleBookings) {
    const createdBooking = await prisma.booking.create({
      data: booking
    });

    // 예약 히스토리 생성
    await prisma.bookingHistory.create({
      data: {
        bookingId: createdBooking.id,
        action: 'CREATED',
        userId: booking.userId,
        details: {
          playerCount: booking.playerCount,
          totalPrice: booking.totalPrice.toString(),
          paymentMethod: booking.paymentMethod
        }
      }
    });

    // GameTimeSlotCache 업데이트 (예약 반영)
    await prisma.gameTimeSlotCache.update({
      where: { gameTimeSlotId: booking.gameTimeSlotId },
      data: {
        bookedPlayers: booking.playerCount,
        availablePlayers: 4 - booking.playerCount,
        isAvailable: 4 - booking.playerCount > 0,
        status: 4 - booking.playerCount > 0 ? 'AVAILABLE' : 'FULLY_BOOKED'
      }
    });

    console.log(`✅ Sample booking created: ${createdBooking.bookingNumber}`);
  }

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
