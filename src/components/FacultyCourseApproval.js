import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../auth"; // Import the useAuth hook

const FacultyCourseApproval = () => {
  const { user } = useAuth(); // Get the user from the AuthContext
  const [facultyLoginId, setFacultyLoginId] = useState(null);
  const [year, setYear] = useState("");
  const [section, setSection] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const years = [
    { label: "I", value: "I" },
    { label: "II", value: "II" },
    { label: "III", value: "III" },
    { label: "IV", value: "IV" },
  ];
  const sections = ["A", "B", "C", "D"];

  useEffect(() => {
    if (user) {
      setFacultyLoginId(user.uid); // Use the unique user ID from Firebase Authentication
      console.log("Logged in Faculty ID:", user.uid); // Log the user ID
    } else {
      console.error("No user logged in!");
    }
  }, [user]);

  const fetchData = async () => {
    if (!year || !section || !facultyLoginId) {
      console.log("Year, section, or facultyLoginId is missing.");
      return;
    }

    setLoading(true);
    try {
      // Query to fetch the latest `noDues` document for the selected year and section
      const noDuesCollectionRef = collection(db, "noDues", year, section);
      const latestNoDuesQuery = query(
        noDuesCollectionRef,
        orderBy("generatedAt", "desc"),
        limit(1)
      );

      const querySnapshot = await getDocs(latestNoDuesQuery);

      if (querySnapshot.empty) {
        console.log("NoDues document not found for the given year and section.");
        setCourses([]);
        setLoading(false);
        return;
      }

      const latestNoDuesDoc = querySnapshot.docs[0];
      const noDuesData = latestNoDuesDoc.data();
      console.log("Fetched noDues data:", noDuesData);

      if (!noDuesData.students || noDuesData.students.length === 0) {
        console.log("No students found for this section.");
        setCourses([]);
        setLoading(false);
        return;
      }

      // Process students data
      const studentsData = await Promise.all(
        noDuesData.students.map(async (student) => {
          const courseEntry = student.courses_faculty?.find(
            (cf) => cf.facultyId === facultyLoginId
          );

          if (!courseEntry) {
            console.log(`Skipping student without matching facultyId.`);
            return null;
          }

          let courseName = "N/A";
          if (courseEntry.courseId) {
            const courseRef = doc(
              db,
              "courses",
              "Computer Science & Engineering (Data Science)",
              "years",
              year,
              "sections",
              section,
              "courseDetails",
              courseEntry.courseId
            );
            const courseSnap = await getDoc(courseRef);
            courseName = courseSnap.exists()
              ? courseSnap.data()?.courseName || "N/A"
              : "N/A";
          }

          const studentRef = doc(db, "students", year, section, student.id);
          const studentSnap = await getDoc(studentRef);
          const studentData = studentSnap.exists() ? studentSnap.data() : {};

          return {
            rollNo: studentData?.rollNo || "N/A",
            studentName: studentData?.name || "N/A",
            courseName,
            status: courseEntry.status || "Pending",
            studentId: student.id,
          };
        })
      );

      const filteredData = studentsData.filter((student) => student !== null);
      console.log("Filtered students data:", filteredData);
      setCourses(filteredData.sort((a, b) => a.rollNo.localeCompare(b.rollNo)));
    } catch (error) {
      console.error("Error fetching data:", error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (year && section && facultyLoginId) {
      fetchData();
    }
  }, [year, section, facultyLoginId]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 flex flex-col items-center">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">
        Faculty Courses Dashboard
      </h1>
      <div className="w-full max-w-4xl bg-white shadow-md rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 font-medium mb-2">Year:</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Year</option>
              {years.map((yr) => (
                <option key={yr.value} value={yr.value}>
                  {yr.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Section:
            </label>
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Section</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>
        {loading ? (
          <p className="text-center text-blue-600 font-medium">Loading...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-2 border border-gray-300 text-left">
                    Roll No
                  </th>
                  <th className="px-4 py-2 border border-gray-300 text-left">
                    Student Name
                  </th>
                  <th className="px-4 py-2 border border-gray-300 text-left">
                    Course Name
                  </th>
                  <th className="px-4 py-2 border border-gray-300 text-left">
                    Status
                  </th>
                  <th className="px-4 py-2 border border-gray-300 text-left">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 ? (
                  <tr>
                    <td
                      colSpan="5"
                      className="px-4 py-2 text-center text-gray-500"
                    >
                      No data available
                    </td>
                  </tr>
                ) : (
                  courses.map((course, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-all"
                    >
                      <td className="px-4 py-2 border border-gray-300">
                        {course.rollNo}
                      </td>
                      <td className="px-4 py-2 border border-gray-300">
                        {course.studentName}
                      </td>
                      <td className="px-4 py-2 border border-gray-300">
                        {course.courseName}
                      </td>
                      <td className="px-4 py-2 border border-gray-300">
                        {course.status}
                      </td>
                      <td className="px-4 py-2 border border-gray-300">
                        <button
                          className="bg-green-500 text-white px-3 py-1 rounded-md mr-2"
                          onClick={() =>
                            console.log("Accept action for:", course.studentId)
                          }
                        >
                          Accept
                        </button>
                        <button
                          className="bg-red-500 text-white px-3 py-1 rounded-md"
                          onClick={() =>
                            console.log("Reject action for:", course.studentId)
                          }
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacultyCourseApproval;
