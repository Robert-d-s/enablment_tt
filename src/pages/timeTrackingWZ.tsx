import React, { useEffect, useRef } from "react";
import { useQuery, useMutation, gql } from "@apollo/client";
import useStore from "../lib/store";

const USERS_QUERY = gql`
  query GetUsers {
    users {
      id
      email
    }
  }
`;

const PROJECTS_QUERY = gql`
  query GetProjects {
    projects {
      id
      name
      teamId
    }
  }
`;

const RATES_QUERY = gql`
  query GetRates($teamId: String!) {
    rates(teamId: $teamId) {
      id
      name
      rate
    }
  }
`;

const CREATE_TIME_MUTATION = gql`
  mutation CreateTime($timeInputCreate: TimeInputCreate!) {
    createTime(timeInputCreate: $timeInputCreate) {
      id
      startTime
      endTime
      totalElapsedTime
    }
  }
`;

const formatDateForDisplay = (date: Date) => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  return date.toLocaleDateString("en-US", options);
};

const TimeKeeper: React.FC = () => {
  const {
    users,
    projects,
    rates,
    selectedUser,
    selectedProject,
    selectedRate,
    setUsers,
    setProjects,
    setRates,
    setSelectedUser,
    setSelectedProject,
    setSelectedRate,
    setTeamId,
  } = useStore();

  // ----------------------------------------------------------------
  console.log("selectedProject from useStore:", selectedProject);
  // ----------------------------------------------------------------

  const { data: usersData } = useQuery(USERS_QUERY);
  const { data: projectsData } = useQuery(PROJECTS_QUERY);
  console.log("selectedProject:", selectedProject);
  const { teamId } = useStore();
  const { data: ratesData, error } = useQuery(RATES_QUERY, {
    variables: { teamId },
  });
  if (error) {
    console.error("Error fetching rates:", error.message);
    console.log("GraphQL Errors:", error.graphQLErrors);
    console.log("Network Error:", error.networkError);
    console.log("Full Error:", error); // Logs the entire ApolloError object
  }

  const [createTime] = useMutation(CREATE_TIME_MUTATION);

  useEffect(() => {
    // Update the teamId in the Zustand store when selectedProject changes
    const selectedProjectObj = projects.find(
      (project) => project.id === selectedProject
    );
    if (selectedProjectObj && selectedProjectObj.teamId) {
      setTeamId(selectedProjectObj.teamId);
    }
  }, [selectedProject, projects, setTeamId]);

  useEffect(() => {
    if (usersData) {
      setUsers(usersData.users);
    }
    if (projectsData) {
      setProjects(projectsData.projects);
    }
    if (ratesData) {
      setRates(ratesData.rates);
    }
  }, [usersData, projectsData, ratesData]);

  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const [isRunning, setIsRunning] = React.useState(false);
  const [isTimerInitiallyStarted, setIsTimerInitiallyStarted] =
    React.useState(false);
  const [startTime, setStartTime] = React.useState<string>("");
  const [elapsedTime, setElapsedTime] = React.useState<number>(0);
  const [pausedTime, setPausedTime] = React.useState<number>(0);

  useEffect(() => {
    let timerInterval: NodeJS.Timeout;
    if (isRunning) {
      if (!isTimerInitiallyStarted) {
        const newStartTime = new Date().toISOString();
        setStartTime(newStartTime);
        setIsTimerInitiallyStarted(true);
      }
      const currentDateTime = new Date();
      startTimeRef.current = pausedTime
        ? new Date(currentDateTime.getTime() - pausedTime)
        : currentDateTime;

      timerInterval = setInterval(() => {
        const now = new Date().getTime();
        const elapsed = startTimeRef.current
          ? now - startTimeRef.current.getTime()
          : 0;

        setElapsedTime(elapsed);
      }, 1000);

      timerIntervalRef.current = timerInterval;
    } else {
      clearInterval(timerIntervalRef.current as NodeJS.Timeout);
      setPausedTime(elapsedTime);
    }

    return () => {
      clearInterval(timerInterval);
    };
  }, [isRunning]);

  const handleStartStop = () => {
    setIsRunning(!isRunning);
    if (!isRunning && !startTime) {
      const newStartTime = new Date().toISOString();
      setStartTime(newStartTime);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedTime(0);
    setPausedTime(0);
    startTimeRef.current = null;
    setSelectedUser("");
    setSelectedProject("");
    setSelectedRate("");
    setIsTimerInitiallyStarted(false);
    setStartTime("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalSeconds = Math.floor(elapsedTime / 1000);
    const totalMilliseconds = totalSeconds * 1000;
    const startDate = new Date(startTime);

    const endDate = new Date(startDate.getTime() + elapsedTime);
    // const formattedEndTime = endDate.toISOString();

    const localStartDate = new Date(startTime);
    const utcStartTime = new Date(
      localStartDate.getTime() - localStartDate.getTimezoneOffset() * 60000
    ).toISOString();

    const localEndDate = new Date(localStartDate.getTime() + elapsedTime);
    const utcEndTime = new Date(
      localEndDate.getTime() - localEndDate.getTimezoneOffset() * 60000
    ).toISOString();

    await createTime({
      variables: {
        timeInputCreate: {
          startTime: utcStartTime,
          endTime: utcEndTime,
          totalElapsedTime: totalMilliseconds,
          userId: parseFloat(selectedUser),
          projectId: selectedProject,
          rateId: parseFloat(selectedRate),
        },
      },
    });
  };

  const formatTimeFromISOString = (isoString: string) => {
    const date = new Date(isoString);
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();

    const formattedTime = `${hours}:${minutes < 10 ? `0${minutes}` : minutes}:${
      seconds < 10 ? `0${seconds}` : seconds
    }`;
    return formattedTime;
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-gray-400 rounded shadow-md flex flex-col">
      <h2 className="text-2xl mb-6 text-black flex items-center justify-center">
        § Track Time §
      </h2>
      <div className="text-xl mb-4 bg-gray-100 text-black flex items-center justify-center">
        {new Date(elapsedTime).toISOString().substr(11, 8)}
      </div>
      <div className="mt-4">
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="form-select block w-full mt-1"
        >
          <option value="" disabled>
            Select a user
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.email}
            </option>
          ))}
        </select>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="form-select block w-full mt-4"
        >
          <option value="" disabled>
            Select a project
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <select
          value={selectedRate}
          onChange={(e) => setSelectedRate(e.target.value)}
          className="form-select block w-full mt-4"
        >
          <option value="" disabled>
            Select a rate
          </option>
          {rates.map((rate) => (
            <option key={rate.id} value={rate.id}>
              {rate.name} ({rate.rate})
            </option>
          ))}
        </select>
      </div>
      <form onSubmit={handleSubmit} className="mt-6">
        <div className="flex items-center justify-between">
          <label htmlFor="startTime" className="mr-2">
            Started at:
          </label>
          <div className="text-center">
            {startTime
              ? `${formatDateForDisplay(new Date())} ${formatTimeFromISOString(
                  startTime
                )}`
              : "Not Started"}
          </div>
        </div>
        <div className="flex justify-between mt-auto py-6">
          <button
            type="button"
            onClick={handleStartStop}
            disabled={!selectedUser || !selectedProject || !selectedRate}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            {isRunning ? "Stop" : "Start"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 bg-red-500 text-white rounded"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isRunning || elapsedTime === 0}
            className="px-4 py-2 bg-green-500 text-white rounded"
          >
            Submit
          </button>
        </div>
      </form>
    </div>
  );
};

export default TimeKeeper;