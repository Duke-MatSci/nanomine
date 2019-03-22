/*************************************************************************************

	BASE_IO.C

	This file contains input/output routines used in the Northwestern Physical Aging
	Codes.  Most of these algorithms are original. These codes have been extended to
	use integer declaration intL, which should in general be defined as "long int", but
	it can be changed to be "int" for necessary reasons.  Whichever choice should be 
	reflected in all future codes to avoid upper counter limits.

	Roger Bradshaw, Northwestern University / University of Washington

	First Written: 1 November 1995
	Updated: 28 November 1997	Mostly changes to layout for new VC++ platform
	Updated: 1 December 1997	Saved as new BASE_IO.C file
	Updated: 25 April 1998		Mostly comment changes/rearranging to be more logical

*************************************************************************************/

#include <stdio.h>
#include <stdlib.h>
#include <math.h>
#include <string.h>
#include <curses.h>
//#include <conio.h>
#include <ctype.h>
#include "baseutil.h"
#include "base_io.h"

#define intL long int					// Use either "int" or "long int"
#define Proj_Name_Length 240			// Maximum project name length (8 for DOS systems)
#define Ext_Name_Length 3				// Maximum extension name length (3 for DOS systems)
#define CLEAR_SCREEN clear_screen() // Function to clear console screen, NULL if none
#define GET_ONE_CH getch()				// Function to get one character only from stdin
#define Message_Length 1000			// Length of message character vector

/*************************************************************************************

	This routine is used at program startup and allows project name pass from DOS line
	(only used for PC systems - if run from Windows argv will be NULL so OK)

*************************************************************************************/

void startup_project_name (char *project, char **argv)
{
	if (argv [1] == NULL)										// Get project from user
		get_project (project);

	else {															// Project passed on command line
		if (strlen (argv [1]) > Proj_Name_Length)		
			nrerror ("\nThe project name given is invalid - too long\n");
		strcpy (project, argv [1]);
		toupper_string (project);
	}

	return;
}

/*************************************************************************************

	This routine gets a DOS acceptable file name from the user

*************************************************************************************/

void get_project (char *project)
{
///////////////////////////// change!!!!!!!!
//	printf ("Enter the name of this project (%d letters max): ", Proj_Name_Length);
//	scanf ("%s", project);
	project = project[1];
	if (strlen (project) > Proj_Name_Length)
		nrerror ("\nThe project name given is invalid - too long\n");

	toupper_string (project);	  // Turn project name to upper case letters

	return;
}

/******************************************`*******************************************

	This routine gets a DOS acceptable file name from the user. This will be the
	associated name for the type of file described by the string "text".

*************************************************************************************/

void get_material (char *matlfile, char *text)
{
	printf ("Enter the project name of the %s file (%d letters max): ",
				text, Proj_Name_Length);
	scanf ("%s", matlfile);
	if (strlen (matlfile) > Proj_Name_Length)
		nrerror ("\nThe project name given is invalid - too long\n");
	toupper_string (matlfile);  // Turn project name to upper case letters
}

/*************************************************************************************

	This routine takes in a string and makes it uppercase.  It eliminates the warning
	that the standard toupper returns (about loss of significant digits due to the fact
	that char terms are 8 bit and intL terms are longer).

	Roger Bradshaw, Northwestern University
	Completed: 11 June 1997

*************************************************************************************/

void toupper_string (char *string)
{
	unsigned int i;
	char changecase [30];

	sprintf (changecase, "ABCDEFGHIJKLMNOPQRSTUVWXYZ");

	for (i = 0 ; i < strlen (string) ; i++)
		if (islower (string [i]) != 0)
			string [i] = changecase [string [i] - 97];

	return;
}

/*************************************************************************************

	This routine takes in a string and makes it lowercase.  It eliminates the warning
	that the standard tolower returns (about loss of significant digits due to the fact
	that char terms are 8 bit and intL terms are longer).

	Roger Bradshaw, University of Washington
	Completed: 13 Jan 1998

*************************************************************************************/

void tolower_string (char *string)
{
	unsigned int i;
	char changecase [30];

	sprintf (changecase, "abcdefghijklmnopqrstuvwxyz");

	for (i = 0 ; i < strlen (string) ; i++)
		if (isupper (string [i]) != 0)
			string [i] = changecase [string [i] - 65];

	return;
}

/*************************************************************************************

	This routine makes a file name from project and extension

	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)

*************************************************************************************/

void make_file_name (char *project, char *extension, char *names)
{
	char *message;
	message = chvector (0, Message_Length);		// Make very big for worst case

// Check length acceptability of project and extension names

	if (strlen (project) > Proj_Name_Length) {
		sprintf (message, "Project name cannot exceed %d characters - correct", 
					Proj_Name_Length);
		nrerror (message);
	}

	if (strlen (extension) > Ext_Name_Length) {
		sprintf (message, "Extension name cannot exceed %d characters - correct", 
					Ext_Name_Length);
		nrerror (message);
	}

// Create file name to be opened	

	strcpy (names, project);   			// Copy project to names
	if (strcmp (extension, "") != 0) {	// 0 means extension was passed as ""
		strcat (names, ".");					// Add period to separate project and extension
		strcat (names, extension);			// Add extension to names to get file name
	}
	toupper_string (names);					// Turn names to upper case letters

	return;
}

/*************************************************************************************

	This routine opens the file project.extenstion for read (Flag = 0),
	write (Flag = 1), or append (Flag = 2). It checks that the file name is legal,
	that it exists in the read/append case, that it can be opened in the write case,
	and returns the file pointer in all cases.

	If Flag = 10, 11 or 12 it does the same procedure as 0, 1, or 2 respectively,
	except that on error it returns NULL file pointer instead of going to nrerror.

	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)
	Updated: 25 April 1998	Added more comments, no other changes

*************************************************************************************/

FILE *open_file_for_read_write_append (char *project, char *extension, intL Flag)
{
	intL report_error = 0;
	char *names, *message;
	FILE *stream;

// Check if errors should be reported - Flag value checked for acceptability in case

	if (Flag > 5) {
		report_error = 1;
		Flag -= 10;
	}

// Declare DMA and make file name specified (checking for length errors)

	message = chvector (0, Message_Length);			// Make very big for worst case
	names = chvector (0, Message_Length);				// Make very big for worst case
	make_file_name (project, extension, names);		// Place file name in names for below

// Several cases

	switch (Flag) 
	{
		case 0:														// File is to be opened for read
			if ((stream = fopen (names, "r")) == NULL) {	// Not null if opened OK
				if (report_error == 0) {						// Error opening - report it
					sprintf (message, "\nThe file %s does not exist - correct\n", names);
					nrerror (message);
				}
				else
					stream = NULL;									// Error opening - report by NULL
			}
			break;

		case 1:														// File is to be opened for write
			if ((stream = fopen (names, "w")) == NULL) {	// Not null if opened OK
				if (report_error == 0) {						// Error opening - report it
					sprintf (message, "\nThe file %s cannot be opened for writing - correct\n", names);
					nrerror (message);
				}
				else
					stream = NULL;									// Error opening - report by NULL
			}
			break;

		case 2:														// File is to be opened for append
			if ((stream = fopen (names, "a")) == NULL) {	// Not null if opened OK
				if (report_error == 0) {						// Error opening - report it
					sprintf (message, "\nThe file %s cannot be appended to - correct\n", names);
					nrerror (message);
				}
				else
					stream = NULL;									// Error opening - report by NULL
			}
			break;

		case 3:														// File is to be opened for read
			if ((stream = fopen (names, "rb")) == NULL) {	// Not null if opened OK
				if (report_error == 0) {						// Error opening - report it
					sprintf (message, "\nThe file %s does not exist - correct\n", names);
					nrerror (message);
				}
				else
					stream = NULL;									// Error opening - report by NULL
			}
			break;

		case 4:															// File is to be opened for write
			if ((stream = fopen (names, "wb")) == NULL) {	// Not null if opened OK
				if (report_error == 0) {							// Error opening - report it
					sprintf (message, "\nThe file %s cannot be opened for writing - correct\n", names);
					nrerror (message);
				}
				else
					stream = NULL;									// Error opening - report by NULL
			}
			break;

		case 5:															// File is to be opened for write
			if ((stream = fopen (names, "ab")) == NULL) {	// Not null if opened OK
				if (report_error == 0) {							// Error opening - report it
					sprintf (message, "\nThe file %s cannot be opened for writing - correct\n", names);
					nrerror (message);
				}
				else
					stream = NULL;									// Error opening - report by NULL
			}
			break;

		default:														// Flag was not valid - report
			nrerror ("Flag value must be 0-5 or 10-15 in"
						" open_file_for_read_write_append");
			break;
	}

	free_chvector (message, 0);
	free_chvector (names, 0);

	return stream;
}

/*************************************************************************************

	file_length

	This routine sees how many lines of data are in a file.  Each line of data contains
	NumTerms terms, and the type of term from i = 0 - NumTerms-1 is given by type [i].

		type [i] = 0	The ith term is an integer
		type [i] = 1	The ith term is a double
		type [i] = 2	The ith term is a character string

	This routine returns the number of lines, but does not save any of the
	read information.

	Roger Bradshaw, Northwestern University
	Updated: 22 March 1997	Pass -NumTerms to treat first line as a header and not count
									Pass "" as extension to use project as the entire filename

*************************************************************************************/

intL file_length (char *project, char *extension, char *names,
						intL *type, intL NumTerms)
{
	intL i, j, tmp_int, exists_header;
	double tmp_double;
	char *tmp_char, *message;
	FILE *stream;

	tmp_char = chvector (0, Message_Length);		// Make very big for worst case
	message = chvector (0, Message_Length);		// Make very big for worst case

// See if the user wants to consider the first line as a header

	exists_header = 0;		// No header line in file
	if (NumTerms < 0) {
		NumTerms *= -1;
		exists_header++;		// There is a header line in file
	}

// Check that file exists and open it for read

	stream = open_file_for_read_write_append (project, extension, 0);

// Now begin reading file and Count how many lines of data

	j = 0;														// Counter for reporting

	if (exists_header == 1 && j == 0) {					// Special case for header
		sprintf (message, "\nError Attempting To Read Header Line, File %s\n", names);
		skip_header (stream, message);
		j++;
	}

	while (!feof(stream)) {

		for (i = 0 ; i < NumTerms ; i++) {

			sprintf (message, "\nError Attempting To Read Data: Line %ld, "
							"Term %ld, File %s\n", j+1, i+1, names);

			if (type [i] == 0)  // Read an integer
				if ( !fscanf(stream, "%ld ", &tmp_int) )
					nrerror (message);

			if (type [i] == 1)  // Read a double
				if ( !fscanf(stream, "%lf ", &tmp_double) )
					nrerror (message);

			if (type [i] == 2)  // Read a character string
				if ( !fscanf(stream, "%s ", tmp_char) )
					nrerror (message);
		}

		j++;
	}

	fclose (stream);

	if (exists_header == 1)		// Reduce number of count by 1 for header
		j--;

	free_chvector (tmp_char, 0);

	return j;
}

/*************************************************************************************

	read_XY_data

	This routine reads X-Y data from the file project.extension. It declares the DMA
	vectors X, Y and S (standard deviations) and stores the result in each. It returns
	the number of data points in NumPts. NOTE: You pass a pointer to the vector X, Y
	and S pointers (i.e. &X, &Y, &S).

	The status of SFlag determines how S is constructed:

		SFlag = 0		S should not be declared (i.e. standard dev. not needed)
				= 1		Set S = Y (take absolute value)
				= 2		Set S = Y0 (first data point value, take absolute value)
				= 3		Set S = 1
				= 4		Read S as third data line in file (take absolute value)
				= 5		Read S as third data line in file (do not take absolute value)

	If SFlag is 0-5, no check is performed to see if the X data is ever-increasing.
	However, SFlag can also be passed as 10-15 - in this case, the X data is checked
	to be ever-increasing, with the table above used with SFlag-10. If the X data is
	found to not always increase, the routine exits in error.

	The value of HFlag determines whether the first line is a header (1) or not (0).
	If it is a header, it will be read and returned in the character vector header.
	
	NOTE: To avoid errors, define header using chvector (0, Message_Length) - this will
	prevent memory overwrites from a header that is too long.

	This routine can be used in many places for reading data. It returns the number
	of points (i.e. X will have value X [0] - X [NumPts-1]).

	Roger Bradshaw, Northwestern University
	Completed: 1 Dec 1997	Checked that it worked for each case
	Updated: 16 Jan 1998		Added check that X vector ever increases if requested
	Updated: 25 April 1998	Cleaned up a bit, eliminated sign term SH (into NumTerms)
	Updated: 9 May 1998		Added Case 5 for 3rd data line without absolute value taken
	
*************************************************************************************/

intL read_XY_data (double **X, double **Y, double **S, char *project, char *extension,
						 intL SFlag, intL HFlag, char *header)
{
	intL j, NumTerms, *type, NumPts, X_Inc;
	double tmp;
	char *names, *err_msg;
	FILE *stream;

// Check status of S and H Flags

	if (HFlag < 0 || HFlag > 1)
		nrerror ("Need to specify whether a header is used in routine Read_XY_Data");

	X_Inc = 0;					// Do not check whether X is ever-increasing
	if (SFlag >= 10) {
		SFlag -= 10;
		X_Inc = 1;				// Check that X is ever-increasing
	}

	if (SFlag < 0 || SFlag > 5)
		nrerror ("Standard deviation flag SFlag not valid in routine Read_XY_Data");
	
// Count number of data points

	if (SFlag < 4)
		NumTerms = 2;							// File contains two lines (X and Y)
	else
		NumTerms = 3;							// File contains X, Y and S (three lines)

	type = ivector (0, NumTerms-1);		// Tells file_length what data types to read
	for (j = 0 ; j < NumTerms ; j++)
		type [j] = 1;

	if (HFlag == 1)							// Sign tells file_length whether header or not
		NumTerms *= -1;
	
	names = chvector (0, Proj_Name_Length + 3);	// File name to be read
	NumPts = file_length (project, extension, names, type, NumTerms);

// Declare necessary DMA
	
	*X = dvector (0, NumPts);						// Make one slot too big for writing
	*Y = dvector (0, NumPts);						// end point outside of this code if
	if (SFlag > 0)										// desired (only use through NumPts-1)
		*S = dvector (0, NumPts);					// Declare S only in this case

// Open file, read header if necessary, read data and set S

	stream = open_file_for_read_write_append (project, extension, 0);
	err_msg = chvector (0, Message_Length);						// Declare error message

	if (HFlag == 1) {														// Skip header if nec.
		sprintf (err_msg, "\nError Attempting To Read Header Line, File %s\n", names);
		skip_header (stream, err_msg);
		strcpy (header, err_msg);										// Save header for later
	}

	for (j = 0 ; j < NumPts ; j++) {
		sprintf (err_msg, "\nError Attempting To Read Data: Line %ld, "	// Err Msg
								"File %s\n", j+1+HFlag, names);

		if (!fscanf (stream, "%lf %lf", &(*X)[j], &(*Y)[j]))	// Read line of data
			nrerror (err_msg);											// Error msg if problem

		switch (SFlag) {
			case 1:											// Same as Y (but not neg.)
				(*S)[j] = fabs ((*Y)[j]);
				break;
			case 2:											// Use first Y value (but not neg.)
				(*S)[j] = fabs ((*Y)[0]);
				break;
			case 3:											// Use first S is unity
				(*S)[j] = 1.;
				break;
			case 4:											// Read S from file (but not neg.)
				if (!fscanf (stream, "%lf", &tmp))	// Read line of data
					nrerror (err_msg);					// Error msg if problem
				(*S)[j] = fabs (tmp);					// Take absolute value
				break;
			case 5:											// Read S from file (but not neg.)
				if (!fscanf (stream, "%lf", &tmp))	// Read line of data
					nrerror (err_msg);					// Error msg if problem
				(*S)[j] = tmp;								// Copy it w/o taking absolute value	
				break;
		}
	}
	fclose (stream);

// Now check that X data is ever-increasing if requested

	if (X_Inc == 1) {
		for (j = 0 ; j < NumPts-1 ; j++) {
			if ((*X)[j+1]  <= (*X)[j])	{						// Data does not increase
				sprintf (err_msg, "\nData In X Vector Decreases From Line %d To %d In File"
										" %s\nThis Condition Is Not Allowed - Correct\n",
										j+1, j+2, names);
				nrerror (err_msg);
			}
		}
	}

// Done so free DMA and return

	free_ivector (type, 0);
	free_chvector (names, 0);

	return NumPts;
}

/*************************************************************************************

	This routine reads a single line of data from the file starting at the current
	pointer position. The line is placed in read_line, and is assumed to terminate if 
	the final character is either a New_Line (10), Carriage_Return (13) or an end
	of file is found. If the length of the line exceeds MaxLength, an error is returned
	to the user.

	Once the line is read, the file pointer is advanced until a character is obtained
	that is not a NL, CR (or space - see below). The file pointer is then backed up one
	slot. This prevents a phony line containing no real information from being read if
	it is attached at the end of the file. This same technique is used if the file
	pointer is at the start of the file to find the first useful line.
	
	This routine will keep spaces if Flag = 0 and will skip spaces (ie not include them
	in read_line) if Flag = 1. If Flag = 1, spaces are also ignored when advancing to
	the start of the next line.

	This routine returns an integer: 0 if file still contains more data after read,
	1 if file at EOF after read, 2 if file contained no data at all

	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)

*************************************************************************************/

intL read_file_single_line (FILE *stream, char *read_line, intL MaxLength, intL Flag)
{
	intL end_of_file = 0, count = 0, done_read = 0;
//	intL i;
	char one_char;
	intL pos;

	strcpy (read_line, "");									// Clear read_line

// Check if at start of file - if so, advance to first data character

	if (fgetpos (stream, &pos) != 0)						// Get position - error if problem
		nrerror ("Could not get FILE position in read_file_single_line");

	if (pos == 0) {											// Advance to first data char
//		i = advance_FILE_pointer_to_data (stream, Flag);
//		if (i == 1)
//			return 2;											// Done reading - it is a NULL file
	}

// Now read single line 

	do {															// Repetitive read of char from line

		if (!feof(stream)) {									// End of file not reached yet
			if (!fscanf(stream, "%c", &one_char))		// Try and read a character
				nrerror ("Error reading character in"
							" read_file_single_line");		// Error if cannot read character
		}

		if (feof(stream))										// If feof after read, last char
			done_read = 1;										// not real so set done marker

		else {													// Last char OK so process
			if (one_char != 13 && one_char != 10) {	// Char if not CR or NL
				if (!(one_char == 32 && Flag == 1))	{	// Addend space or not?
					if (count > MaxLength)					// Too long - error
						nrerror ("Line longer than MaxLength in read_file_single_line");
					else {										// Addend and increse counter
						sprintf (read_line, "%s%c", read_line, one_char);			
						count++;									
					}
				}
			}
			else													// CR or NL so done
				done_read = 1;
		}

	} while (done_read == 0);								// Continue reading until done

// Advance until read a new character that is not NL, CR, or space (if Flag == 1)

//	done_read = advance_FILE_pointer_to_data (stream, Flag);

//	if (!feof(stream)) {									// End of file not reached yet
//		if (!fscanf(stream, "%c", &one_char))		// Try and read a character
//			nrerror ("Error reading character in"
//						" read_file_single_line");		// Error if cannot read character
//		else
//			move_FILE_back_n_slots (stream, 1);

//		printf ("\n%d",one_char);
//	}

	if (feof(stream))										// If feof after read, last char
		done_read = 1;										// not real so set done marker
	else
		done_read=0;

	return done_read;											// 1 if EOF, 0 if not
}

/*************************************************************************************

	This advances the file pointer to the next occurrence of useful data. If Flag = 0,
	it counts spaces as useful. If Flag = 1, spaces are skipped.
	
	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)

*************************************************************************************/

intL advance_FILE_pointer_to_data (FILE *stream, intL Flag) 
{
	intL done_read = 0;
	char one_char;
	
	do {															// Repetitive read until done

		if (!feof(stream)) {									// End of file not reached yet
			if (!fscanf(stream, "%c", &one_char))		// Try and read a character
				nrerror ("Error reading character in"
							" read_file_single_line");		// Error if cannot read character
		}

		if (feof(stream))										// If feof after read, last char
			done_read = 2;										// not real so set done marker
	
		else {													// Check if character
			if (one_char != 13 && one_char != 10)		// Not NL or CR
				if (!(Flag == 1 && one_char == 32))		// Skip space if flagged
					done_read = 1;								// Set done marker
		}
	
	} while (done_read == 0);

	done_read--;												// 0 if not EOF, 1 if EOF

	if (done_read == 0)										// If not EOF move back one slot
		move_FILE_back_n_slots (stream, 1);

	return done_read;
}

/*************************************************************************************

	This routine moves the file pointer back n slots. If there is a problem, an error
	is returned to the user
	
	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)

*************************************************************************************/

void move_FILE_back_n_slots (FILE *stream, intL n) {

	intL pos;

	if (fgetpos (stream, &pos) != 0)					// Get position - error if problem
		nrerror ("Could not get FILE position in move_FILE_back_n_slots");

	pos -= (intL) n;												// Move pointer back n slots

	if (fsetpos (stream, &pos) != 0)					// Set position - error if problem
		nrerror ("Could not set FILE position in move_FILE_back_n_slots");

	return;
}

/*************************************************************************************

	This routine takes in a FILE pointer and reads from that file until the first
	return (or newline) is reached.  This will skip the header line. If there is a
	problem, the passed string "message" will be reported to the user. In the end,
	the header is returned in message. Obviously, this is destructive to message.

	NOTE: To be safe, declare message using DMA with chvector (0, Message_Length) where
			Message_Length is defined above. This will prevent memory errors if the
			header is too long. There is no way to check on the length of memory
			allocated to message to ensure that I am not overwriting something.
			
	Roger Bradshaw, Northwestern University
	Completed: 22 March 1997
	Updated: 28 November 1997	Changed NULL to 0 in end of string terminator
	Updated: 1 Dec 1997			Returned header in message - see NOTE above
	Updated: 25 April 1997		Added some comments

	NOTE: This file is somewhat redundant and could be replaced by read_file_single_line
			This may be something to do in the future although it is OK as is

*************************************************************************************/

void skip_header (FILE *stream, char *message)
{
	intL i;
	char *tmp_char;

	tmp_char = chvector (0, Message_Length);					// Will put the header here

	i = 0;
	do {
		if ( !fscanf(stream, "%c", &tmp_char [i]) )			// Couldn't read a character
			nrerror (message);										// Error message given
		i++;
		if (i > Message_Length)										// Don't allow to get too long
			nrerror ("Header is too long to be read by skip_header");
	} while (tmp_char[i-1] != 13 && tmp_char[i-1] != 10);	// Look for CR or NL
	tmp_char [i] = 0;													// End tmp_char string

	strcpy (message, tmp_char);									// Copy header into message
	free_chvector (tmp_char, 0);

	return;
}

/*************************************************************************************

	This routine reads a configuration file which contains lines of the form
		
		  config_label=config_value

	It searches through a list of provided config_labels (provided as a char matrix)
	and places the associated config_value in another char matrix as a string for
	retrieval by another code.

	In the event that the config_label read has no counterpart in the provided list,
	the code will report an error that the user can choose to recover from.

	If Max_Length is passed as negative, config_values is not set to "" in this routine

	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)
	Code Updated: 16 Feb 1998	Added -MaxLength flag to not erase config_values via ""

*************************************************************************************/

void read_config_file (char *project, char *extension, char **config_labels,
							  char **config_values, intL NumLabels, intL Max_Length)
{
	intL i, done_read, init_len, zero_values;
	char *read_line, *read_label, *read_value, *message, *one_label, *tok_ptr;
	FILE *stream;

	zero_values = 1;
	if (Max_Length < 0) {
		Max_Length *= -1;
		zero_values = 0;
	}

// Set up DMA vectors for data and clear values

	read_line = chvector (0, 2 * Max_Length);		// Make very big for worst case
	read_label = chvector (0, 2 * Max_Length);	// Make very big for worst case
	read_value = chvector (0, 2 * Max_Length);	// Make very big for worst case
	message = chvector (0, Message_Length);		// Make very big for worst case

	if (zero_values == 1) {
		for (i = 0 ; i < NumLabels ; i++)
			strcpy (&config_values [i][0], "");		// Zero value
	}

// Check that file exists and open for reading

	stream = open_file_for_read_write_append (project, extension, 10);
	if (stream == NULL) {								// No config file so return
		free_chvector (message, 0);
		free_chvector (read_line, 0);
		free_chvector (read_label, 0);
		free_chvector (read_value, 0);
		return;
	}

// Now begin reading file. Each time, read 1 line, strip out spaces, tokenize to
// find "=" sign and place in proper slot. If at file EOF, done_read is set to 1

	do {														// Loop until all lines processed

		done_read = read_file_single_line (stream, read_line, 2 * Max_Length, 1);

		if (done_read == 2) {							// Config file contained nothing
			fclose (stream);
			free_chvector (message, 0);
			free_chvector (read_line, 0);
			free_chvector (read_label, 0);
			free_chvector (read_value, 0);
			return;
		}

		sprintf (message, "Config file line\n%s\ndoes not contain = token in read_"
					"config_file", read_line);			// Prepare in case of error
		init_len = strlen (read_line);				// How long is string for check below
		tok_ptr = strtok (read_line, "=");			// Get label from line
		if ((intL) strlen (tok_ptr) == init_len)	// No token (=) in line that was read
			nrerror (message);
		strcpy (read_label, tok_ptr);

		tok_ptr = strtok (NULL, "=");					// Get label
		init_len -= (intL) (strlen (tok_ptr) + strlen (read_label) + 1);
		if (init_len != 0)								// More than one token (=) in line
			nrerror ("Config file line contains more than one = token in read_config_file");
		strcpy (read_value, tok_ptr);

		for (i = 0 ; i < NumLabels ; i++) {
			one_label = &config_labels [i][0];						// Set pointer to compare
			if (strcmp (one_label, read_label) == 0) {			// Found equal label
				strcpy (&config_values [i][0], read_value);		// Copy value to it
				i = 3 * NumLabels;										// Leave loop since done
			}
		}

		if (i < 3 * NumLabels) {										// If so, no hit
			sprintf (message, "Config label |%s| is not a \nrecognized"
						" label in read_config_file", read_label);
			error_with_ignore (message);
		}

	} while (done_read == 0);

	fclose (stream);

	free_chvector (message, 0);
	free_chvector (read_line, 0);
	free_chvector (read_label, 0);
	free_chvector (read_value, 0);

	return;
}

/*************************************************************************************

	This routine takes in a string obtained from a configuration file that contains the
	value passed (NULL if nothing passed or no config file). It is also given the
	default value.

	The code first looks at the string to see if it contains a value - if it does, it
	then checks if it satisfies the limits specified. Exclusive_Flag determines 
	whether the limits are inclusive (0) or exclusive (1)

	If the string is NULL, the code uses the default value (Use_Default = 1) or asks 
	the user to input a value.
	
	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)
	Updated: 25 April 1998	Added comments

*************************************************************************************/

double set_dbl_param_value (char *config_dbl, double default_value, char *query,
									 char *err_msg, double LowLim, double HighLim,
									 intL Exclusive_Flag, intL Use_Default)
{
	char *remainder;
	double dval;

	if (strcmp (config_dbl, "") != 0) {				// Use value from file (not NULL)
		dval = strtod (config_dbl, &remainder);	// Convert string to double
		check_double_limits (dval, err_msg, LowLim, HighLim, Exclusive_Flag);
	}

	else {													// Get value from default or user
		if (Use_Default == 1)
			dval = default_value;
		else
			dval = get_dbl_value (query, err_msg, LowLim, HighLim, Exclusive_Flag);
	}
	
	return dval;
}

/*************************************************************************************

	This routine takes in a string obtained from a configuration file that contains the
	value passed (NULL if nothing passed or no config file). It is also given the
	default value.

	The code first looks at the string to see if it contains a value - if it does, it
	then checks if it satisfies the limits specified.

	If the string is NULL, the code then looks at the state of Use_Default. If it is 1
	the default value is used, otherwise the user to is asked to input the value.
		
	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)

*************************************************************************************/

intL set_int_param_value (char *config_int, intL default_value, char *query,
								  char *err_msg, intL LowLim, intL HighLim, intL Use_Default)
{
	char *remainder;
	intL ival;

	if (strcmp (config_int, "") != 0) {					// Use value from file (not NULL)
		ival = strtol (config_int, &remainder, 10);	// Convert string to int
		if (ival < LowLim || ival > HighLim)			// Check limits
			nrerror (err_msg);
	}

	else {														// Get value from default or user
		if (Use_Default == 1)
			ival = default_value;
		else
			ival = get_int_value (query, err_msg, LowLim, HighLim);
	}
	
	return ival;
}

/*************************************************************************************

	This routine reads an integer value from the keyboard. It checks that it is between
	the limits specified. If it is not, the error message given is returned.

	Roger Bradshaw, Northwestern University
	Completed: 2 Dec 1997						

*************************************************************************************/

intL get_int_value (char *query, char *err_msg, intL LowLim, intL HighLim)
{
	intL i;

	printf (query);
	scanf ("%ld", &i);
	if (i < LowLim || i > HighLim)
		nrerror (err_msg);
	printf ("\n");												

	return i;
}

/*************************************************************************************

	This routine reads a double value from the keyboard. It checks that it is between
	the limits specified. If it is not, the error message given is returned. Flag
	determines whether the limits are inclusive (0) or exclusive (1)

	Roger Bradshaw, Northwestern University
	Completed: 2 Dec 1997						

*************************************************************************************/

double get_dbl_value (char *query, char *err_msg, double LowLim,
							 double HighLim, intL Flag)
{
	double dval;

	printf (query);
	scanf ("%lf", &dval);
	check_double_limits (dval, err_msg, LowLim, HighLim, Flag);		// Check limits
	printf ("\n");

	return dval;
}

/*************************************************************************************

	This routine checks if a double is within the lower and upper limits specified
	(Flag = 0 means exclusive, Flag = 1 means inclusive). If the value is acceptable,
	the code returns. Otherwise, the code exits in error.
	
	Roger Bradshaw, University of Washington
	Code Completed: 13 Jan 1998 (verified)

*************************************************************************************/

void check_double_limits (double dval, char *err_msg, 
								  double LowLim, double HighLim, intL Flag)
{
	if (Flag == 0) {											// Check exclusive case
		if (dval < LowLim || dval > HighLim)
			nrerror (err_msg);
	}
	else {														// Check inclusive case
		if (dval <= LowLim || dval >= HighLim)	
			nrerror (err_msg);
	}

	return;
}

/*************************************************************************************

	This routine stops the printout every step prints and waits for the user to hit a
	key to continue.  Used a lot of places but only now made it a function! It will not
	stop on the last step.

	Roger Bradshaw, Northwestern University
	Completed: 9 July 1997

*************************************************************************************/

void wait_key (intL i, intL N, intL step) {
	if ( ((i+1) % step == 0) && (i != N-1) )			// Clear if step done but not last
		hit_key (1);
	return;
}

/*************************************************************************************

	This routine waits for the user to hit any key. It clears the screen afterwards if
	clear_screen_check is 1.

	Roger Bradshaw, Northwestern University
	Completed: 9 July 1997

*************************************************************************************/

void hit_key (intL clear_screen_check) {
	printf ("\n\nHit Any Key To Continue");
	GET_ONE_CH;
	if (clear_screen_check == 1)
		CLEAR_SCREEN;
	return;
}

/*************************************************************************************

	This routine locates the cursor at the position mentioned below (25 x 80 screen).
	NOTE: ANSI must be available for this command to work properly
		
	Roger Bradshaw, University of Washington
	Code Completed: 17 Feb 1998 (verified)

*************************************************************************************/

void locate_on_screen (intL RowNumber, intL ColumnNumber)
{
	if (RowNumber > 25)
		nrerror ("RowNumber Cannot Exceed 25 In locate_on_screen");
	if (RowNumber < 1)
		nrerror ("RowNumber Cannot Be Less Than 0 In locate_on_screen");
	if (ColumnNumber > 80)
		nrerror ("RowNumber Cannot Exceed 25 In locate_on_screen");
	if (ColumnNumber < 1)
		nrerror ("ColumnNumber Cannot Be Less Than 0 In locate_on_screen");
	printf ("\033[%d;%dH", RowNumber, ColumnNumber);
}

/*************************************************************************************

	This routine changes text color
	NOTE: ANSI must be available for this command to work properly

      Foreground colors          Background colors

         30  Black                  40  Black
         31  Red                    41  Red
         32  Green                  42  Green
         33  Yellow                 43  Yellow
         34  Blue                   44  Blue
         35  Magenta                45  Magenta
         36  Cyan                   46  Cyan
         37  White                  47  White
		
	Roger Bradshaw, University of Washington
	Code Completed: 17 Feb 1998 (verified)

*************************************************************************************/

void change_screen_color (intL ForegroundNumber, intL BackgroundNumber)
{
	if (ForegroundNumber > 37)
		nrerror ("ForegroundNumber Cannot Exceed 37 In locate_on_screen");
	if (ForegroundNumber < 30)
		nrerror ("ForegroundNumber Cannot Be Less Than 30 In locate_on_screen");
	if (BackgroundNumber > 47)
		nrerror ("BackgroundNumber Cannot Exceed 47 In locate_on_screen");
	if (BackgroundNumber < 40)
		nrerror ("BackgroundNumber Cannot Be Less Than 40 In locate_on_screen");
	printf ("\033[%d;%dm", ForegroundNumber, BackgroundNumber);
}

/*************************************************************************************

	This routine clears the screen.
	NOTE: ANSI must be available for this command to work properly
		
	Roger Bradshaw, University of Washington
	Code Completed: 17 Feb 1998 (verified)

*************************************************************************************/

void clear_screen ()
{
	printf ("\033[2J");
	locate_on_screen (1, 1);
	return;
}

/**************************  End Of BASE_IO.C  **************************************/
