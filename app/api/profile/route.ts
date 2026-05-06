import { NextResponse } from 'next/server';
import studentProfile from '@/data/student_profile.json';

const profiles = [studentProfile] as Array<Record<string, any>>;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get('student_id');

  const profile = profiles.find((item) => item.student_id === studentId);
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  return NextResponse.json(profile);
}
