import { baseApi } from './baseApi';

export interface Course {
  id: number;
  name: string;
  location: string;
  description: string;
  rating: number;
  pricePerHour: number;
  imageUrl: string;
  amenities: string[];
  openTime: string;
  closeTime: string;
}

export interface CourseSearchFilters {
  keyword?: string;
  location?: string;
  priceRange?: [number, number];
  rating?: number;
  date?: string;
}

export const courseApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    searchCourses: builder.query<Course[], CourseSearchFilters>({
      query: (filters) => ({
        url: '/courses/search',
        params: filters,
      }),
      providesTags: ['Course'],
    }),

    getCourses: builder.query<Course[], void>({
      query: () => '/courses',
      providesTags: ['Course'],
    }),

    getCourseById: builder.query<Course, number>({
      query: (id) => `/courses/${id}`,
      providesTags: (result, error, id) => [{ type: 'Course', id }],
    }),
  }),
});

export const {
  useSearchCoursesQuery,
  useGetCoursesQuery,
  useGetCourseByIdQuery,
} = courseApi;