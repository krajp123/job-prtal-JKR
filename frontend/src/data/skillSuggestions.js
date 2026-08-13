// Static suggestion list for the Skills chip-input on the Profile page.
// TODO(backend): swap this for a real /api/skills/suggest?q= endpoint later
// if you want suggestions driven by what's actually in demand on the platform.
const SKILL_SUGGESTIONS = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust',
    'React', 'React Native', 'Vue.js', 'Angular', 'Next.js', 'Redux',
    'Node.js', 'Express.js', 'Django', 'Flask', 'Spring Boot', '.NET',
    'MongoDB', 'MySQL', 'PostgreSQL', 'Redis', 'Firebase', 'GraphQL',
    'HTML', 'CSS', 'Tailwind CSS', 'Sass', 'Bootstrap',
    'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'Google Cloud', 'CI/CD',
    'REST APIs', 'Socket.io', 'Microservices', 'System Design',
    'Machine Learning', 'Data Analysis', 'SQL', 'Pandas', 'TensorFlow',
    'UI/UX Design', 'Figma', 'Project Management', 'Agile/Scrum',
    'Communication', 'Problem Solving', 'Team Leadership',
];

export default SKILL_SUGGESTIONS;
