import { PrismaClient, SlotType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 코스 캐시 데이터 생성
  const courses = [
    {
      courseId: 1,
      name: '그린밸리 골프클럽',
      location: '경기도 용인시',
      description: '아름다운 자연 속 프리미엄 18홀 골프코스',
      rating: 4.8,
      pricePerHour: 80000,
      imageUrl: 'https://images.unsplash.com/photo-1593111774240-d529f12cf4bb?w=800&q=80',
      amenities: ['클럽하우스', '레스토랑', '프로샵', '주차장'],
      openTime: '06:00',
      closeTime: '18:00',
      isActive: true
    },
    {
      courseId: 2,
      name: '선셋힐 컨트리클럽',
      location: '강원도 춘천시',
      description: '석양이 아름다운 언덕 위의 골프코스',
      rating: 4.6,
      pricePerHour: 65000,
      imageUrl: 'https://images.unsplash.com/photo-1587174486073-ae5e5cec4cdf?w=800&q=80',
      amenities: ['클럽하우스', '레스토랑', '연습장'],
      openTime: '06:30',
      closeTime: '17:30',
      isActive: true
    },
    {
      courseId: 3,
      name: '오션뷰 리조트',
      location: '부산광역시 기장군',
      description: '바다가 보이는 럭셔리 골프 리조트',
      rating: 4.9,
      pricePerHour: 120000,
      imageUrl: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=800&q=80',
      amenities: ['클럽하우스', '레스토랑', '프로샵', '호텔', '스파'],
      openTime: '06:00',
      closeTime: '19:00',
      isActive: true
    }
  ];

  // 코스 캐시 생성
  for (const course of courses) {
    await prisma.courseCache.upsert({
      where: { courseId: course.courseId },
      update: course,
      create: course
    });
    console.log(`✅ Course cache created: ${course.name}`);
  }

  // 타임슬롯 가용성 데이터 생성 (오늘부터 7일간)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    for (const course of courses) {
      const startHour = parseInt(course.openTime.split(':')[0]);
      const endHour = parseInt(course.closeTime.split(':')[0]);

      for (let hour = startHour; hour < endHour; hour++) {
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        const isPremium = hour >= 12 && hour <= 16;
        const price = isPremium ? Math.floor(course.pricePerHour * 1.2) : course.pricePerHour;

        await prisma.timeSlotAvailability.create({
          data: {
            timeSlotId: Math.floor(Math.random() * 1000000),
            slotType: SlotType.NINE_HOLE,
            singleCourseId: course.courseId,
            singleCourseName: course.name,
            date: date,
            startTime: timeSlot,
            endTime: `${(hour + 1).toString().padStart(2, '0')}:00`,
            maxCapacity: 4,
            currentBookings: Math.floor(Math.random() * 2), // 0-1명 랜덤 예약
            availableSlots: 4 - Math.floor(Math.random() * 2),
            isAvailable: true,
            isPremium: isPremium,
            price: price
          }
        });
      }
    }
    console.log(`✅ Time slots created for ${date.toISOString().split('T')[0]}`);
  }

  // 샘플 예약 데이터 생성
  const sampleBookings = [
    {
      timeSlotId: Math.floor(Math.random() * 1000000),
      slotType: SlotType.NINE_HOLE,
      bookingDate: new Date(today.getTime() + 24 * 60 * 60 * 1000), // 내일
      startTime: '09:00',
      endTime: '10:00',
      singleCourseId: 1,
      singleCourseName: '그린밸리 골프클럽',
      userId: 1,
      playerCount: 2,
      pricePerPerson: 80000,
      serviceFee: 4800,
      totalPrice: 164800,
      paymentMethod: 'card',
      bookingNumber: `BK${Date.now().toString().slice(-8)}`,
      userEmail: 'user1@example.com',
      userName: '김골프',
      userPhone: '010-1234-5678'
    },
    {
      timeSlotId: Math.floor(Math.random() * 1000000),
      slotType: SlotType.NINE_HOLE,
      bookingDate: new Date(today.getTime() + 2 * 24 * 60 * 60 * 1000), // 모레
      startTime: '14:00',
      endTime: '15:00',
      singleCourseId: 2,
      singleCourseName: '선셋힐 컨트리클럽',
      userId: 2,
      playerCount: 4,
      pricePerPerson: 78000, // 프리미엄 시간대
      serviceFee: 9360,
      totalPrice: 321360,
      paymentMethod: 'kakaopay',
      bookingNumber: `BK${(Date.now() + 1000).toString().slice(-8)}`,
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